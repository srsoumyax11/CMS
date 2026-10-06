"""add_audience_groups_tables

Revision ID: c367db00afa4
Revises: 5d788995cb67
Create Date: 2026-10-02 22:20:51.662628

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c367db00afa4'
down_revision: Union[str, Sequence[str], None] = '5d788995cb67'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()

    # 1. Create audience_groups table
    op.create_table(
        'audience_groups',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_by_id', sa.UUID(), nullable=False),
        sa.Column('filter_course_id', sa.UUID(), nullable=True),
        sa.Column('filter_department_id', sa.UUID(), nullable=True),
        sa.Column('filter_year', sa.Integer(), nullable=True),
        sa.Column('filter_hostel', sa.String(length=255), nullable=True),
        sa.Column('filter_user_types', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['filter_course_id'], ['courses.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['filter_department_id'], ['departments.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )

    # 2. Create audience_group_members table (Option 1)
    op.create_table(
        'audience_group_members',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('group_id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('added_manually', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('added_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['group_id'], ['audience_groups.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('group_id', 'user_id', name='uq_audience_group_member')
    )

    # 3. Add target_audience_group_id to notices table
    op.add_column(
        'notices',
        sa.Column('target_audience_group_id', sa.UUID(), nullable=True)
    )
    op.create_foreign_key(
        'fk_notices_audience_group',
        'notices',
        'audience_groups',
        ['target_audience_group_id'],
        ['id'],
        ondelete='SET NULL'
    )

    # 4. Seed RBAC Asset & Actions for audience_group
    conn.execute(sa.text("INSERT INTO assets (id, name) VALUES (gen_random_uuid(), 'audience_group') ON CONFLICT (name) DO NOTHING;"))

    for action in ['create', 'view', 'list', 'edit', 'delete']:
        conn.execute(sa.text(f"""
            INSERT INTO permissions (id, asset_id, action_id)
            SELECT gen_random_uuid(), a.id, ac.id
            FROM assets a, actions ac
            WHERE a.name = 'audience_group' AND ac.code = '{action}'
            ON CONFLICT ON CONSTRAINT uq_permission_asset_action DO NOTHING;
        """))

    # Grant audience_group permissions to SuperAdmin, Admin, HOD, and Faculty
    conn.execute(sa.text("""
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id
        FROM roles r
        CROSS JOIN permissions p
        JOIN assets a ON p.asset_id = a.id
        WHERE r.name IN ('SuperAdmin', 'Admin', 'HOD', 'Faculty') AND a.name = 'audience_group'
        ON CONFLICT DO NOTHING;
    """))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('fk_notices_audience_group', 'notices', type_='foreignkey')
    op.drop_column('notices', 'target_audience_group_id')
    op.drop_table('audience_group_members')
    op.drop_table('audience_groups')
