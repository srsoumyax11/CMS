
"""seed_permissions

Revision ID: c8a87009d512
Revises: a53e4cd1d87a
Create Date: 2026-10-08 03:32:16.027170

"""
from typing import Sequence, Union
import uuid
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text

# revision identifiers, used by Alembic.
revision: str = "c8a87009d512"
down_revision: Union[str, Sequence[str], None] = "a53e4cd1d87a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from app.core.permissions import Perms
    
    conn = op.get_bind()

    # 1. Parse Perms
    perms_dict = {k: v for k, v in Perms.__dict__.items() if not k.startswith("__")}
    asset_names = set()
    action_codes = set()
    for k, v in perms_dict.items():
        if isinstance(v, str) and ":" in v:
            asset, action = v.split(":")
            asset_names.add(asset)
            action_codes.add(action)

    # 2. Insert Assets
    for name in asset_names:
        conn.execute(
            text("INSERT INTO assets (id, name, created_at, updated_at) VALUES (:id, :name, NOW(), NOW()) ON CONFLICT (name) DO NOTHING"),
            {"id": str(uuid.uuid4()), "name": name}
        )

    # 3. Insert Actions
    for code in action_codes:
        conn.execute(
            text("INSERT INTO actions (id, code, created_at, updated_at) VALUES (:id, :code, NOW(), NOW()) ON CONFLICT (code) DO NOTHING"),
            {"id": str(uuid.uuid4()), "code": code}
        )

    # 4. Fetch the inserted Assets and Actions
    assets = conn.execute(text("SELECT id, name FROM assets")).fetchall()
    asset_map = {row[1]: str(row[0]) for row in assets}

    actions = conn.execute(text("SELECT id, code FROM actions")).fetchall()
    action_map = {row[1]: str(row[0]) for row in actions}

    # 5. Insert Permissions combinations
    for k, v in perms_dict.items():
        if isinstance(v, str) and ":" in v:
            asset_name, action_code = v.split(":")
            asset_id = asset_map[asset_name]
            action_id = action_map[action_code]
            
            conn.execute(
                text("INSERT INTO permissions (id, asset_id, action_id, created_at, updated_at) VALUES (:id, :asset_id, :action_id, NOW(), NOW()) ON CONFLICT (asset_id, action_id) DO NOTHING"),
                {"id": str(uuid.uuid4()), "asset_id": asset_id, "action_id": action_id}
            )
            
    # 6. Fetch Permissions mapping
    perms = conn.execute(text("SELECT id, asset_id, action_id FROM permissions")).fetchall()
    perm_map = {f"{str(row[1])}_{str(row[2])}": str(row[0]) for row in perms}

    # 7. Grant ALL permissions to admin role
    admin_roles = conn.execute(text("SELECT id FROM roles WHERE name = 'admin'")).fetchall()
    if admin_roles:
        admin_role_id = admin_roles[0][0]
        
        for k, v in perms_dict.items():
            if isinstance(v, str) and ":" in v:
                asset_name, action_code = v.split(":")
                asset_id = asset_map[asset_name]
                action_id = action_map[action_code]
                
                perm_id = perm_map[f"{asset_id}_{action_id}"]
                
                conn.execute(
                    text("INSERT INTO role_permissions (role_id, permission_id) VALUES (:role_id, :permission_id) ON CONFLICT DO NOTHING"),
                    {"role_id": str(admin_role_id), "permission_id": perm_id}
                )

def downgrade() -> None:
    pass

