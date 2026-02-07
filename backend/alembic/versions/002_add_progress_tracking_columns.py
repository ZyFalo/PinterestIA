"""add progress tracking columns

Revision ID: 002
Revises: 001
Create Date: 2026-02-05

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "boards",
        sa.Column("pins_uploaded", sa.Integer(), server_default="0", nullable=False),
    )
    op.add_column(
        "boards",
        sa.Column(
            "pins_analyzed_count", sa.Integer(), server_default="0", nullable=False
        ),
    )


def downgrade() -> None:
    op.drop_column("boards", "pins_analyzed_count")
    op.drop_column("boards", "pins_uploaded")
