"""remove_user_id_from_users_table

Revision ID: 07409fdae37c
Revises: 06394fdae37b
Create Date: 2026-10-05 04:37:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '07409fdae37c'
down_revision: Union[str, Sequence[str], None] = '06394fdae37b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - Drop user_id string column from users table."""
    conn = op.get_bind()
    # Safely drop index and column if exists
    conn.execute(sa.text("DROP INDEX IF EXISTS ix_users_user_id;"))
    conn.execute(sa.text("ALTER TABLE users DROP COLUMN IF EXISTS user_id;"))


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column('users', sa.Column('user_id', sa.String(length=50), nullable=True))
    op.create_index(op.f('ix_users_user_id'), 'users', ['user_id'], unique=True)
