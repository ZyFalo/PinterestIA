import uuid
from datetime import datetime

from pydantic import BaseModel

from app.schemas.outfit import OutfitResponse


class BoardCreate(BaseModel):
    pinterest_url: str
    name: str | None = None


class BoardResponse(BaseModel):
    id: uuid.UUID
    name: str
    pinterest_url: str
    image_url: str | None = None
    pins_count: int
    status: str
    analyzed_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class BoardDetail(BoardResponse):
    outfits: list[OutfitResponse] = []
