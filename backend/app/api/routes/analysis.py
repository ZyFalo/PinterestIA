import asyncio
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import delete, func as sa_func, select, update
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DBSession
from app.core.database import async_session
from app.models.board import Board
from app.models.garment import Garment
from app.models.outfit import Outfit
from app.schemas.board import AnalysisStatus
from app.schemas.garment import GarmentRank
from app.schemas.outfit import OutfitDetail, OutfitResponse
from app.services.ai_vision import analyze_outfit_image
from app.services.pinterest import scrape_board_images

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["analysis"])


async def _run_analysis(board_id: uuid.UUID, user_id: uuid.UUID) -> None:
    """Background task que ejecuta scraping + análisis en dos fases."""
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

            board.pins_count = scrape_data["detected_pin_count"]
            board.pins_analyzed_count = 0
            if scrape_data.get("cover_image"):
                board.image_url = scrape_data["cover_image"]
            if scrape_data.get("name") and board.name == board.pinterest_url.rstrip("/").split("/")[-1].replace("-", " ").title():
                board.name = scrape_data["name"]
            board.status = "analyzing"
            await db.commit()

            image_urls = scrape_data["image_urls"]
            pin_urls = scrape_data.get("pin_urls", [])

            # ═══ FASE 2: ANÁLISIS CON GEMINI (crear outfit + analizar + crear garments) ═══
            for i, image_url in enumerate(image_urls):
                try:
                    pin_url = pin_urls[i] if i < len(pin_urls) else None

                    # Crear outfit con URL de Pinterest directamente
                    outfit = Outfit(
                        board_id=board_id,
                        image_url=image_url,
                        source_pin_url=pin_url,
                    )
                    db.add(outfit)
                    await db.flush()

                    # Analizar con Gemini usando URL directa de Pinterest
                    analysis = await analyze_outfit_image(image_url)

                    outfit.style = analysis.get("outfit_style")
                    outfit.season = analysis.get("outfit_season")

                    for g in analysis.get("garments", []):
                        garment = Garment(
                            outfit_id=outfit.id,
                            name=g["name"],
                            type=g["type"],
                            color=g.get("color"),
                            material=g.get("material"),
                            style=g.get("style"),
                            season=g.get("season"),
                            confidence=g.get("confidence"),
                        )
                        db.add(garment)

                    await db.execute(
                        update(Board).where(Board.id == board_id)
                        .values(pins_analyzed_count=Board.pins_analyzed_count + 1)
                    )
                    await db.commit()
                except Exception as e:
                    logger.error("Error analizando imagen %d/%d: %s", i + 1, len(image_urls), e)
                    await db.rollback()
                    continue

            # ═══ FASE 3: FINALIZACIÓN ═══
            result = await db.execute(select(Board).where(Board.id == board_id))
            board = result.scalar_one()

            if board.pins_analyzed_count == 0:
                board.status = "failed"
                logger.error("Tablero %s: scraping OK (%d pins) pero 0 outfits creados", board_id, len(image_urls))
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
        select(Outfit)
        .where(Outfit.board_id == board_id)
        .order_by(Outfit.created_at)
    )
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
    "/boards/{board_id}/trends", response_model=list[GarmentRank]
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
            Garment.color,
            sa_func.count().label("count"),
        )
        .join(Outfit)
        .where(Outfit.board_id == board_id)
        .group_by(Garment.type, Garment.color)
        .order_by(sa_func.count().desc())
    )
    return [
        GarmentRank(type=row.type, color=row.color, count=row.count)
        for row in result.all()
    ]
