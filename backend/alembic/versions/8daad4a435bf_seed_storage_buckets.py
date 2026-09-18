"""seed_storage_buckets

Revision ID: 8daad4a435bf
Revises: d090be53a034
Create Date: 2026-09-17 23:36:39.586322

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8daad4a435bf'
down_revision: Union[str, Sequence[str], None] = 'd090be53a034'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
