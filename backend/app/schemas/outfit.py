import uuid
from datetime import datetime

from pydantic import BaseModel

from app.schemas.garment import GarmentResponse


class OutfitResponse(BaseModel):
    id: uuid.UUID
    image_url: str
    cloudinary_url: str | None = None
    style: str | None = None
    season: str | None = None
    source_pin_url: str | None = None
    garments_count: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}


class OutfitDetail(OutfitResponse):
    garments: list[GarmentResponse] = []
