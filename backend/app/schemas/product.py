import uuid
from datetime import datetime

from pydantic import BaseModel


class ProductResponse(BaseModel):
    id: uuid.UUID
    name: str
    price: str | None = None
    store: str | None = None
    image_url: str | None = None
    product_url: str | None = None
    similarity: float | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
