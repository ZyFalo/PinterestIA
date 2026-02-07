import uuid

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DBSession
from app.models.board import Board
from app.models.outfit import Outfit
from app.schemas.board import BoardCreate, BoardDetail, BoardResponse
from app.services.pinterest import resolve_pinterest_url, validate_pinterest_url

router = APIRouter(prefix="/api/boards", tags=["boards"])


@router.post("/", response_model=BoardResponse, status_code=status.HTTP_201_CREATED)
async def create_board(data: BoardCreate, current_user: CurrentUser, db: DBSession):
    # Resolver URLs cortas de Pinterest (pin.it/...)
    resolved_url = await resolve_pinterest_url(data.pinterest_url)

    if not validate_pinterest_url(resolved_url):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="URL de Pinterest inválida. Formato esperado: https://pinterest.com/usuario/tablero o https://pin.it/...",
        )

    # Verificar que el usuario no tenga ya un tablero con esta URL
    existing = await db.execute(
        select(Board).where(Board.user_id == current_user.id, Board.pinterest_url == resolved_url)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya tienes un tablero con esta URL de Pinterest",
        )

    board = Board(
        user_id=current_user.id,
        name=data.name or resolved_url.rstrip("/").split("/")[-1].replace("-", " ").title(),
        pinterest_url=resolved_url,
    )
    db.add(board)
    await db.commit()
    await db.refresh(board)
    return board


@router.get("/", response_model=list[BoardResponse])
async def list_boards(current_user: CurrentUser, db: DBSession):
    result = await db.execute(
        select(Board)
        .options(selectinload(Board.outfits))
        .where(Board.user_id == current_user.id)
        .order_by(Board.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{board_id}", response_model=BoardDetail)
async def get_board(board_id: uuid.UUID, current_user: CurrentUser, db: DBSession):
    result = await db.execute(
        select(Board)
        .options(selectinload(Board.outfits).selectinload(Outfit.garments))
        .where(Board.id == board_id, Board.user_id == current_user.id)
    )
    board = result.scalar_one_or_none()

    if board is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tablero no encontrado",
        )
    return board


@router.delete("/{board_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_board(board_id: uuid.UUID, current_user: CurrentUser, db: DBSession):
    result = await db.execute(
        select(Board).where(Board.id == board_id, Board.user_id == current_user.id)
    )
    board = result.scalar_one_or_none()

    if board is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tablero no encontrado",
        )

    await db.delete(board)
    await db.commit()
