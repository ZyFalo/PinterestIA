import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Outfit(Base):
    __tablename__ = "outfits"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    board_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("boards.id", ondelete="CASCADE"), index=True
    )
    image_url: Mapped[str] = mapped_column(Text)
    cloudinary_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    style: Mapped[str | None] = mapped_column(String(50), nullable=True)
    season: Mapped[str | None] = mapped_column(String(50), nullable=True)
    source_pin_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
    )

    board: Mapped["Board"] = relationship(back_populates="outfits")  # noqa: F821
    garments: Mapped[list["Garment"]] = relationship(  # noqa: F821
        back_populates="outfit", cascade="all, delete-orphan"
    )

    @property
    def garments_count(self) -> int:
        return len(self.garments)
