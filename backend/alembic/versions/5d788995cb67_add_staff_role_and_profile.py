"""add_staff_role_and_profile

Revision ID: 5d788995cb67
Revises: 0ab205cab979
Create Date: 2026-10-02 21:47:39.555318

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5d788995cb67'
down_revision: Union[str, Sequence[str], None] = '0ab205cab979'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


from sqlalchemy.dialects.postgresql import ENUM

def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    conn.execute(sa.text("ALTER TYPE user_type_enum ADD VALUE IF NOT EXISTS 'staff';"))

    op.create_table('staff_profiles',
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('department_id', sa.UUID(), nullable=True),
    sa.Column('designation', sa.String(length=255), nullable=False),
    sa.Column('employment_status', ENUM('active', 'on_leave', 'resigned', 'retired', 'terminated', name='employment_status_enum', create_type=False), nullable=False),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['department_id'], ['departments.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id')
    )

    # Seed RBAC Asset & Actions for StaffProfile
    conn.execute(sa.text("INSERT INTO assets (id, name) VALUES (gen_random_uuid(), 'staff_profile') ON CONFLICT (name) DO NOTHING;"))

    for action in ['create', 'view', 'list', 'edit', 'delete']:
        conn.execute(sa.text(f"""
            INSERT INTO permissions (id, asset_id, action_id)
            SELECT gen_random_uuid(), a.id, ac.id
            FROM assets a, actions ac
            WHERE a.name = 'staff_profile' AND ac.code = '{action}'
            ON CONFLICT ON CONSTRAINT uq_permission_asset_action DO NOTHING;
        """))

    # Grant staff_profile permissions to SuperAdmin and Admin
    conn.execute(sa.text("""
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id
        FROM roles r
        CROSS JOIN permissions p
        JOIN assets a ON p.asset_id = a.id
        WHERE r.name IN ('SuperAdmin', 'Admin') AND a.name = 'staff_profile'
        ON CONFLICT DO NOTHING;
    """))

    # Seed Staff Role
    conn.execute(sa.text("""
        INSERT INTO roles (id, name, description, is_system_role)
        VALUES (gen_random_uuid(), 'Staff', 'Non-teaching staff role with facility and administrative access', TRUE)
        ON CONFLICT (name) DO NOTHING;
    """))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('staff_profiles')
