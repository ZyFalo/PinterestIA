import uuid

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DBSession
from app.models.board import Board
from app.models.garment import Garment
from app.models.outfit import Outfit
from app.models.product import Product
from app.schemas.garment import GarmentDetail
from app.schemas.product import ProductResponse
from app.services.product_search import search_products

router = APIRouter(prefix="/api", tags=["products"])


async def _get_user_garment(
    garment_id: uuid.UUID, user_id: uuid.UUID, db, *, load_products: bool = False
) -> Garment:
    """Busca una prenda verificando que pertenece al usuario."""
    query = (
        select(Garment)
        .join(Outfit)
        .join(Board)
        .where(Garment.id == garment_id, Board.user_id == user_id)
    )
    if load_products:
        query = query.options(selectinload(Garment.products))

    result = await db.execute(query)
    garment = result.scalar_one_or_none()

    if garment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Prenda no encontrada"
        )
    return garment


@router.post(
    "/garments/{garment_id}/search-products",
    response_model=list[ProductResponse],
    status_code=status.HTTP_201_CREATED,
)
async def search_garment_products(
    garment_id: uuid.UUID, current_user: CurrentUser, db: DBSession
):
    """Busca productos similares a una prenda y los guarda en DB."""
    garment = await _get_user_garment(garment_id, current_user.id, db)

    # Construir dict con atributos de la prenda para la búsqueda
    garment_data = {
        "name": garment.name,
        "type": garment.type,
        "color": garment.color,
        "material": garment.material,
        "style": garment.style,
    }

    try:
        results = await search_products(garment_data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error al buscar productos: {str(e)}",
        )

    # Eliminar productos anteriores de esta prenda
    old_result = await db.execute(
        select(Product).where(Product.garment_id == garment_id)
    )
    for old_product in old_result.scalars().all():
        await db.delete(old_product)

    # Crear nuevos registros Product
    created = []
    for item in results:
        product = Product(
            garment_id=garment_id,
            name=item["name"],
            price=item.get("price"),
            store=item.get("store"),
            image_url=item.get("image_url"),
            product_url=item.get("product_url"),
        )
        db.add(product)
        created.append(product)

    await db.commit()

    # Refrescar para obtener IDs y created_at
    for product in created:
        await db.refresh(product)

    return created


@router.get("/garments/{garment_id}/products", response_model=list[ProductResponse])
async def list_garment_products(
    garment_id: uuid.UUID, current_user: CurrentUser, db: DBSession
):
    """Lista los productos encontrados para una prenda."""
    garment = await _get_user_garment(
        garment_id, current_user.id, db, load_products=True
    )
    return garment.products


@router.get("/garments/{garment_id}", response_model=GarmentDetail)
async def get_garment(
    garment_id: uuid.UUID, current_user: CurrentUser, db: DBSession
):
    """Obtiene el detalle de una prenda con sus productos."""
    garment = await _get_user_garment(
        garment_id, current_user.id, db, load_products=True
    )
    return garment
