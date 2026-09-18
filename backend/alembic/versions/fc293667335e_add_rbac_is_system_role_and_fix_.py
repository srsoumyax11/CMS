"""Add RBAC is_system_role and fix relationships

Revision ID: fc293667335e
Revises: f506cad87777
Create Date: 2026-09-14 17:13:10.467552

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fc293667335e'
down_revision: Union[str, Sequence[str], None] = 'f506cad87777'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # is_system_role is now included in the initial roles table creation (f506cad87777).
    pass


def downgrade() -> None:
    pass
