"""seed_facilities_permissions

Revision ID: 31106b4d3124
Revises: 8568502afb63
Create Date: 2026-10-02 23:31:44.504990

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '31106b4d3124'
down_revision: Union[str, Sequence[str], None] = '8568502afb63'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    
    # 1. Assets
    assets = ["fee", "visitor", "hostel"]
    for asset in assets:
        conn.execute(sa.text(f"INSERT INTO assets (id, name) VALUES (gen_random_uuid(), '{asset}') ON CONFLICT (name) DO NOTHING;"))
        
    # 2. Actions (already exist mostly, but just in case)
    actions = ["manage", "view"]
    for action in actions:
        conn.execute(sa.text(f"INSERT INTO actions (id, code) VALUES (gen_random_uuid(), '{action}') ON CONFLICT (code) DO NOTHING;"))
        
    # 3. Permissions
    valid_perms = {
        "fee": ["manage"],
        "visitor": ["manage", "view"],
        "hostel": ["manage"]
    }
    
    for asset, acts in valid_perms.items():
        for act in acts:
            conn.execute(sa.text(f"""
                INSERT INTO permissions (id, asset_id, action_id) 
                SELECT gen_random_uuid(), ast.id, act.id 
                FROM assets ast, actions act 
                WHERE ast.name = '{asset}' AND act.code = '{act}'
                ON CONFLICT (asset_id, action_id) DO NOTHING;
            """))

    # 4. Assign to SuperAdmin and Admin
    for role in ["SuperAdmin", "Admin"]:
        for asset, acts in valid_perms.items():
            for act in acts:
                conn.execute(sa.text(f"""
                    INSERT INTO role_permissions (role_id, permission_id)
                    SELECT r.id, p.id 
                    FROM roles r, permissions p
                    JOIN assets ast ON p.asset_id = ast.id
                    JOIN actions a ON p.action_id = a.id
                    WHERE r.name = '{role}' AND ast.name = '{asset}' AND a.code = '{act}'
                    ON CONFLICT DO NOTHING;
                """))


def downgrade() -> None:
    pass
