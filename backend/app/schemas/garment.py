import uuid
from datetime import datetime

from pydantic import BaseModel

from app.schemas.product import ProductResponse


class GarmentResponse(BaseModel):
    id: uuid.UUID
    name: str
    type: str
    color: str | None = None
    material: str | None = None
    style: str | None = None
    season: str | None = None
    image_url: str | None = None
    confidence: float | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class GarmentDetail(GarmentResponse):
    products: list[ProductResponse] = []


class GarmentRank(BaseModel):
    name: str
    count: int


class GarmentTypeRank(BaseModel):
    type: str
    count: int
    garments: list[GarmentRank]


class ColorRank(BaseModel):
    color: str
    count: int
