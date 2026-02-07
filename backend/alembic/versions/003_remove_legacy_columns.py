"""remove legacy columns: pins_uploaded, cloudinary_url, garments.image_url

Revision ID: 003
Revises: 002
Create Date: 2026-02-07

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("boards", "pins_uploaded")
    op.drop_column("outfits", "cloudinary_url")
    op.drop_column("garments", "image_url")


def downgrade() -> None:
    op.add_column(
        "garments",
        sa.Column("image_url", sa.Text(), nullable=True),
    )
    op.add_column(
        "outfits",
        sa.Column("cloudinary_url", sa.Text(), nullable=True),
    )
    op.add_column(
        "boards",
        sa.Column("pins_uploaded", sa.Integer(), server_default="0", nullable=False),
    )
