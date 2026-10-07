"""seed_initial_data

Revision ID: a53e4cd1d87a
Revises: f40914276b10
Create Date: 2026-10-08 02:46:04.583046

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a53e4cd1d87a'
down_revision: Union[str, Sequence[str], None] = 'f40914276b10'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Basic RBAC assets
    roles_table = sa.table('roles',
        sa.column('id', sa.UUID),
        sa.column('name', sa.String),
        sa.column('description', sa.String),
        sa.column('is_system_role', sa.Boolean),
        sa.column('created_at', sa.DateTime),
        sa.column('updated_at', sa.DateTime)
    )

    import datetime
    now = datetime.datetime.now(datetime.timezone.utc)

    # Pre-defined system roles
    roles = [
        {'id': '00000000-0000-0000-0000-000000000001', 'name': 'admin', 'description': 'System Administrator', 'is_system_role': True, 'created_at': now, 'updated_at': now},
        {'id': '00000000-0000-0000-0000-000000000002', 'name': 'faculty', 'description': 'Faculty Member', 'is_system_role': True, 'created_at': now, 'updated_at': now},
        {'id': '00000000-0000-0000-0000-000000000003', 'name': 'student', 'description': 'Student', 'is_system_role': True, 'created_at': now, 'updated_at': now},
        {'id': '00000000-0000-0000-0000-000000000004', 'name': 'staff', 'description': 'Staff Member', 'is_system_role': True, 'created_at': now, 'updated_at': now},
        {'id': '00000000-0000-0000-0000-000000000005', 'name': 'parent', 'description': 'Parent / Guardian', 'is_system_role': True, 'created_at': now, 'updated_at': now},
        {'id': '00000000-0000-0000-0000-000000000006', 'name': 'user', 'description': 'Default user', 'is_system_role': True, 'created_at': now, 'updated_at': now},
    ]
    
    op.bulk_insert(roles_table, roles)


def downgrade() -> None:
    pass
