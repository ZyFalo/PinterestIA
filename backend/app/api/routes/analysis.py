import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import delete, func as sa_func, select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DBSession
from app.models.board import Board
from app.models.garment import Garment
from app.models.outfit import Outfit
from app.schemas.garment import GarmentRank
from app.schemas.outfit import OutfitDetail, OutfitResponse
from app.services.ai_vision import analyze_outfit_image
from app.services.cloudinary import upload_image_from_url
from app.services.pinterest import scrape_board_images

router = APIRouter(prefix="/api", tags=["analysis"])


@router.post("/boards/{board_id}/analyze", response_model=dict)
async def analyze_board(
    board_id: uuid.UUID, current_user: CurrentUser, db: DBSession
):
    # Buscar tablero del usuario
    result = await db.execute(
        select(Board).where(Board.id == board_id, Board.user_id == current_user.id)
    )
    board = result.scalar_one_or_none()

    if board is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tablero no encontrado"
        )

    if board.status == "analyzing":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El tablero ya está siendo analizado",
        )

    # Borrar outfits anteriores para re-análisis limpio (CASCADE elimina garments y products)
    await db.execute(delete(Outfit).where(Outfit.board_id == board_id))

    # Cambiar status a analyzing
    board.status = "analyzing"
    await db.commit()

    try:
        # Scrape de imágenes
        scrape_data = await scrape_board_images(board.pinterest_url)

        # Actualizar info del tablero
        board.pins_count = scrape_data["pins_count"]
        if scrape_data.get("cover_image"):
            board.image_url = scrape_data["cover_image"]
        if scrape_data.get("name") and board.name == board.pinterest_url.rstrip("/").split("/")[-1].replace("-", " ").title():
            board.name = scrape_data["name"]

        outfits_created = 0
        garments_created = 0

        image_urls = scrape_data["image_urls"]
        pin_urls = scrape_data.get("pin_urls", [])

        for i, image_url in enumerate(image_urls):
            pin_url = pin_urls[i] if i < len(pin_urls) else None

            try:
                # Upload a Cloudinary
                cloudinary_url = await upload_image_from_url(
                    image_url, str(board_id), f"outfit_{i}"
                )

                # Analizar con Gemini Vision
                analysis = await analyze_outfit_image(image_url)

                # Crear Outfit
                outfit = Outfit(
                    board_id=board_id,
                    image_url=image_url,
                    cloudinary_url=cloudinary_url,
                    style=analysis.get("outfit_style"),
                    season=analysis.get("outfit_season"),
                    source_pin_url=pin_url,
                )
                db.add(outfit)
                await db.flush()
                outfits_created += 1

                # Crear Garments
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
                    garments_created += 1

            except Exception:
                # Si falla una imagen individual, continuar con las demás
                continue

        board.status = "completed"
        board.analyzed_at = datetime.now(timezone.utc)
        await db.commit()

        return {
            "status": "completed",
            "board_id": str(board_id),
            "outfits_created": outfits_created,
            "garments_created": garments_created,
            "pins_scraped": len(image_urls),
        }

    except ValueError as e:
        board.status = "failed"
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )
    except Exception as e:
        board.status = "failed"
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error durante el análisis: {str(e)}",
        )


@router.get("/boards/{board_id}/outfits", response_model=list[OutfitResponse])
async def list_board_outfits(
    board_id: uuid.UUID, current_user: CurrentUser, db: DBSession
):
    # Verificar que el tablero pertenece al usuario
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
