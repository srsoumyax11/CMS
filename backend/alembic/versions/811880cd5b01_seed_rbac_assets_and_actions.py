"""seed_rbac_assets_and_actions

Revision ID: 811880cd5b01
Revises: 733293a5f90d
Create Date: 2026-09-18 23:07:15.617165

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text


# revision identifiers, used by Alembic.
revision: str = '811880cd5b01'
down_revision: Union[str, Sequence[str], None] = '733293a5f90d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    
    # 2. RBAC Data (Assets & Actions)
    assets = ["student_profile", "faculty_profile", "role", "notice", "complaint", "outpass", "timetable", "attendance", "mess"]
    for asset in assets:
        conn.execute(text(f"INSERT INTO assets (id, name) VALUES (gen_random_uuid(), '{asset}') ON CONFLICT (name) DO NOTHING;"))
        
    actions = ["view", "list", "create", "edit", "delete", "approve", "reject", "resolve", "assign", "view_private", "manage", "mark", "feedback", "cancel"]
    for action in actions:
        conn.execute(text(f"INSERT INTO actions (id, code) VALUES (gen_random_uuid(), '{action}') ON CONFLICT (code) DO NOTHING;"))
        
    # Permissions matrix
    valid_perms = {
        "student_profile": ["view", "list", "create", "edit", "delete", "approve", "reject"],
        "faculty_profile": ["view", "list", "create", "edit", "delete", "approve", "reject"],
        "role": ["view", "list", "create", "edit", "delete", "approve", "reject"],
        "notice": ["view", "list", "create", "edit", "delete", "approve", "reject"],
        "complaint": ["view", "list", "create", "edit", "delete", "resolve", "assign", "view_private"],
        "outpass": ["create", "view", "cancel", "list", "approve", "reject"],
        "timetable": ["manage", "view"],
        "attendance": ["mark", "view"],
        "mess": ["manage", "view", "feedback"]
    }
    
    for asset, acts in valid_perms.items():
        for act in acts:
            conn.execute(text(f"""
                INSERT INTO permissions (id, asset_id, action_id) 
                SELECT gen_random_uuid(), ast.id, act.id 
                FROM assets ast, actions act 
                WHERE ast.name = '{asset}' AND act.code = '{act}'
                ON CONFLICT (asset_id, action_id) DO NOTHING;
            """))


def downgrade() -> None:
    """Downgrade schema."""
    pass
