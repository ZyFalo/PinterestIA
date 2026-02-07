import asyncio
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import delete, func as sa_func, select, update
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DBSession
from app.core.database import async_session
from app.models.board import Board
from app.models.garment import Garment
from app.models.outfit import Outfit
from app.schemas.board import AnalysisStatus
from collections import defaultdict

from app.schemas.garment import ColorRank, GarmentRank, GarmentTypeRank
from app.schemas.outfit import OutfitDetail, OutfitResponse
from app.services.ai_vision import analyze_outfit_image
from app.services.pinterest import scrape_board_images

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["analysis"])


async def _evaluate_garment_filter(
    db,
    board_id: uuid.UUID,
    garment_name: list[str],
    connectors_str: str | None,
    garment_colors: list[str] | None = None,
) -> set[uuid.UUID]:
    """Devuelve outfit_ids que cumplen el filtro de prendas con conectores.

    Si garment_colors está presente, solo considera prendas cuyo color
    esté en la lista (el color actúa como atributo de la prenda).
    """
    conn_list = connectors_str.split(",") if connectors_str else []
    all_or = not conn_list or all(c == "or" for c in conn_list)

    color_cond = Garment.color.in_(garment_colors) if garment_colors else None

    if len(garment_name) == 1 or all_or:
        q = (
            select(sa_func.distinct(Garment.outfit_id))
            .join(Outfit)
            .where(Outfit.board_id == board_id, Garment.name.in_(garment_name))
        )
        if color_cond is not None:
            q = q.where(color_cond)
        name_result = await db.execute(q)
        return {row[0] for row in name_result.all()}

    if all(c == "and" for c in conn_list):
        q = (
            select(Garment.outfit_id)
            .join(Outfit)
            .where(Outfit.board_id == board_id, Garment.name.in_(garment_name))
        )
        if color_cond is not None:
            q = q.where(color_cond)
        q = q.group_by(Garment.outfit_id).having(
            sa_func.count(sa_func.distinct(Garment.name)) == len(garment_name)
        )
        and_result = await db.execute(q)
        return {row[0] for row in and_result.all()}

    # Mixed AND/OR: evaluate with Python sets
    q = (
        select(Garment.name, Garment.outfit_id)
        .join(Outfit)
        .where(Outfit.board_id == board_id, Garment.name.in_(garment_name))
    )
    if color_cond is not None:
        q = q.where(color_cond)
    mapping_result = await db.execute(q)
    name_to_outfits: dict[str, set[uuid.UUID]] = defaultdict(set)
    for row in mapping_result.all():
        name_to_outfits[row.name].add(row.outfit_id)

    result_ids = name_to_outfits.get(garment_name[0], set())
    for i, conn in enumerate(conn_list):
        if i + 1 < len(garment_name):
            next_ids = name_to_outfits.get(garment_name[i + 1], set())
            if conn == "and":
                result_ids = result_ids & next_ids
            else:
                result_ids = result_ids | next_ids
    return result_ids

GEMINI_CONCURRENCY = 3


async def _run_analysis(board_id: uuid.UUID, user_id: uuid.UUID) -> None:
    """Background task que ejecuta scraping + análisis concurrente."""
    async with async_session() as db:
        try:
            result = await db.execute(
                select(Board).where(Board.id == board_id, Board.user_id == user_id)
            )
            board = result.scalar_one_or_none()
            if board is None:
                return

            # ═══ FASE 1: SCRAPING ═══
            board.status = "scraping"
            await db.commit()

            scrape_data = await scrape_board_images(board.pinterest_url)

            board.pins_count = len(scrape_data["image_urls"])
            board.pins_analyzed_count = 0
            if scrape_data.get("cover_image"):
                board.image_url = scrape_data["cover_image"]
            if scrape_data.get("name") and board.name == board.pinterest_url.rstrip("/").split("/")[-1].replace("-", " ").title():
                board.name = scrape_data["name"]
            board.status = "analyzing"
            await db.commit()

            image_urls = scrape_data["image_urls"]
            pin_urls = scrape_data.get("pin_urls", [])

            # ═══ FASE 2: PRE-CREAR OUTFITS ═══
            outfits_map: list[tuple[uuid.UUID, str]] = []
            for i, image_url in enumerate(image_urls):
                pin_url = pin_urls[i] if i < len(pin_urls) else None
                outfit = Outfit(
                    board_id=board_id,
                    image_url=image_url,
                    source_pin_url=pin_url,
                )
                db.add(outfit)
                await db.flush()
                outfits_map.append((outfit.id, image_url))
            await db.commit()

            # ═══ FASE 3: ANÁLISIS CONCURRENTE CON GEMINI ═══
            semaphore = asyncio.Semaphore(GEMINI_CONCURRENCY)

            async def _analyze_single(outfit_id: uuid.UUID, img_url: str) -> None:
                try:
                    analysis = await analyze_outfit_image(img_url, semaphore=semaphore)
                    async with async_session() as task_db:
                        res = await task_db.execute(
                            select(Outfit).where(Outfit.id == outfit_id)
                        )
                        outfit_obj = res.scalar_one()
                        outfit_obj.style = analysis.get("outfit_style")
                        outfit_obj.season = analysis.get("outfit_season")
                        for g in analysis.get("garments", []):
                            task_db.add(Garment(
                                outfit_id=outfit_id,
                                name=g["name"],
                                type=g["type"],
                                color=g.get("color"),
                                material=g.get("material"),
                                style=g.get("style"),
                                season=g.get("season"),
                                confidence=g.get("confidence"),
                            ))
                        await task_db.execute(
                            update(Board).where(Board.id == board_id)
                            .values(pins_analyzed_count=Board.pins_analyzed_count + 1)
                        )
                        await task_db.commit()
                except Exception as e:
                    logger.error("Error analizando outfit %s: %s", outfit_id, e)
                    try:
                        async with async_session() as err_db:
                            await err_db.execute(
                                update(Board).where(Board.id == board_id)
                                .values(pins_analyzed_count=Board.pins_analyzed_count + 1)
                            )
                            await err_db.commit()
                    except Exception:
                        pass

            await asyncio.gather(
                *[_analyze_single(oid, url) for oid, url in outfits_map]
            )

            # ═══ FASE 4: FINALIZACIÓN ═══
            result = await db.execute(select(Board).where(Board.id == board_id))
            board = result.scalar_one()

            garment_count = await db.execute(
                select(sa_func.count())
                .select_from(Garment)
                .join(Outfit)
                .where(Outfit.board_id == board_id)
            )
            total_garments = garment_count.scalar() or 0

            if total_garments == 0:
                board.status = "failed"
                logger.error("Tablero %s: 0 prendas identificadas de %d pins", board_id, len(image_urls))
            else:
                board.status = "completed"
            board.analyzed_at = datetime.now(timezone.utc)
            await db.commit()

        except Exception as e:
            logger.error("Error en análisis del tablero %s: %s", board_id, e)
            try:
                result = await db.execute(
                    select(Board).where(Board.id == board_id)
                )
                board = result.scalar_one_or_none()
                if board:
                    board.status = "failed"
                    await db.commit()
            except Exception:
                await db.rollback()


@router.post("/boards/{board_id}/analyze", status_code=202)
async def analyze_board(
    board_id: uuid.UUID, current_user: CurrentUser, db: DBSession
):
    result = await db.execute(
        select(Board).where(Board.id == board_id, Board.user_id == current_user.id)
    )
    board = result.scalar_one_or_none()

    if board is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tablero no encontrado"
        )

    if board.status in ("scraping", "analyzing"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El tablero ya está siendo analizado",
        )

    # Borrar outfits anteriores para re-análisis limpio
    await db.execute(delete(Outfit).where(Outfit.board_id == board_id))

    board.status = "scraping"
    board.pins_count = 0
    board.pins_analyzed_count = 0
    await db.commit()

    # Lanzar análisis en background
    asyncio.create_task(_run_analysis(board_id, current_user.id))

    return {"message": "Análisis iniciado", "board_id": str(board_id)}


@router.get("/boards/{board_id}/status", response_model=AnalysisStatus)
async def get_board_status(
    board_id: uuid.UUID, current_user: CurrentUser, db: DBSession
):
    result = await db.execute(
        select(Board).where(Board.id == board_id, Board.user_id == current_user.id)
    )
    board = result.scalar_one_or_none()

    if board is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tablero no encontrado"
        )

    # Contar garments creados
    garments_count_result = await db.execute(
        select(sa_func.count())
        .select_from(Garment)
        .join(Outfit)
        .where(Outfit.board_id == board_id)
    )
    garments_created = garments_count_result.scalar() or 0

    # board.status ya contiene la fase explícita
    phase = board.status

    return AnalysisStatus(
        status=board.status,
        phase=phase,
        pins_total=board.pins_count,
        pins_analyzed=board.pins_analyzed_count,
        outfits_created=board.pins_analyzed_count,
        garments_created=garments_created,
    )


@router.get("/boards/{board_id}/outfits", response_model=list[OutfitResponse])
async def list_board_outfits(
    board_id: uuid.UUID,
    current_user: CurrentUser,
    db: DBSession,
    garment_name: list[str] | None = Query(None),
    garment_color: list[str] | None = Query(None),
    garment_type: str | None = None,
    connectors: str | None = None,
):
    board_result = await db.execute(
        select(Board.id).where(
            Board.id == board_id, Board.user_id == current_user.id
        )
    )
    if board_result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tablero no encontrado"
        )

    query = (
        select(Outfit)
        .options(selectinload(Outfit.garments))
        .where(Outfit.board_id == board_id)
    )

    # ── Filtro combinado: colores actúan como atributo de prendas ──
    has_colors = garment_color and len(garment_color) > 0
    has_names = garment_name and len(garment_name) > 0

    if has_names and has_colors:
        # Colores + prendas: buscar prendas que coincidan en nombre Y color
        combined_ids = await _evaluate_garment_filter(
            db, board_id, garment_name, connectors,
            garment_colors=garment_color,
        )
        if combined_ids:
            query = query.where(Outfit.id.in_(combined_ids))
        else:
            query = query.where(Outfit.id == None)  # noqa: E711
    elif has_colors:
        # Solo colores: outfits con cualquier prenda de ese color
        color_result = await db.execute(
            select(sa_func.distinct(Garment.outfit_id))
            .join(Outfit)
            .where(
                Outfit.board_id == board_id,
                Garment.color.in_(garment_color),
            )
        )
        color_outfit_ids = {row[0] for row in color_result.all()}
        if color_outfit_ids:
            query = query.where(Outfit.id.in_(color_outfit_ids))
        else:
            query = query.where(Outfit.id == None)  # noqa: E711
    elif has_names:
        # Solo prendas: outfits que cumplan el filtro de nombres
        name_outfit_ids = await _evaluate_garment_filter(
            db, board_id, garment_name, connectors
        )
        if name_outfit_ids:
            query = query.where(Outfit.id.in_(name_outfit_ids))
        else:
            query = query.where(Outfit.id == None)  # noqa: E711
    elif garment_type:
        query = query.join(Garment).where(Garment.type == garment_type).distinct()

    query = query.order_by(Outfit.created_at)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/outfits/{outfit_id}", response_model=OutfitDetail)
async def get_outfit(
    outfit_id: uuid.UUID, current_user: CurrentUser, db: DBSession
):
    result = await db.execute(
        select(Outfit)
        .options(selectinload(Outfit.garments))
        .join(Board)
        .where(Outfit.id == outfit_id, Board.user_id == current_user.id)
    )
    outfit = result.scalar_one_or_none()

    if outfit is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Outfit no encontrado"
        )
    return outfit


@router.get(
    "/boards/{board_id}/trends", response_model=list[GarmentTypeRank]
)
async def get_board_trends(
    board_id: uuid.UUID, current_user: CurrentUser, db: DBSession
):
    board_result = await db.execute(
        select(Board.id).where(
            Board.id == board_id, Board.user_id == current_user.id
        )
    )
    if board_result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tablero no encontrado"
        )

    result = await db.execute(
        select(
            Garment.type,
            Garment.name,
            sa_func.count().label("count"),
        )
        .join(Outfit)
        .where(Outfit.board_id == board_id)
        .group_by(Garment.type, Garment.name)
        .order_by(Garment.type, sa_func.count().desc())
    )
    rows = result.all()

    type_groups: dict[str, list[GarmentRank]] = defaultdict(list)
    for row in rows:
        type_groups[row.type].append(GarmentRank(name=row.name, count=row.count))

    type_ranks = [
        GarmentTypeRank(
            type=t,
            count=sum(g.count for g in gs),
            garments=gs,
        )
        for t, gs in type_groups.items()
    ]
    type_ranks.sort(key=lambda x: x.count, reverse=True)
    return type_ranks


@router.get(
    "/boards/{board_id}/color-trends", response_model=list[ColorRank]
)
async def get_board_color_trends(
    board_id: uuid.UUID,
    current_user: CurrentUser,
    db: DBSession,
    garment_name: list[str] | None = Query(None),
    connectors: str | None = None,
):
    board_result = await db.execute(
        select(Board.id).where(
            Board.id == board_id, Board.user_id == current_user.id
        )
    )
    if board_result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tablero no encontrado"
        )

    color_query = (
        select(Garment.color, sa_func.count().label("count"))
        .join(Outfit)
        .where(Outfit.board_id == board_id, Garment.color.isnot(None))
    )

    if garment_name and len(garment_name) > 0:
        color_query = color_query.where(Garment.name.in_(garment_name))

    color_query = color_query.group_by(Garment.color).order_by(
        sa_func.count().desc()
    )
    result = await db.execute(color_query)
    rows = result.all()
    return [ColorRank(color=row.color, count=row.count) for row in rows]
