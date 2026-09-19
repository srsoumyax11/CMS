"""seed_admin_system_roles

Revision ID: 4f4e97f972dd
Revises: 811880cd5b01
Create Date: 2026-09-18 23:07:16.269939

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text


# revision identifiers, used by Alembic.
revision: str = '4f4e97f972dd'
down_revision: Union[str, Sequence[str], None] = '811880cd5b01'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    # Roles — only system roles are seeded. Student/Faculty are created via the Admin UI.
    conn.execute(text("""
        INSERT INTO roles (id, name, is_system_role) 
        VALUES (gen_random_uuid(), 'SuperAdmin', true)
        ON CONFLICT (name) DO UPDATE SET is_system_role = true;
    """))
    conn.execute(text("""
        INSERT INTO roles (id, name, is_system_role) 
        VALUES (gen_random_uuid(), 'Admin', true)
        ON CONFLICT (name) DO UPDATE SET is_system_role = true;
    """))
        
    # RolePermissions - SuperAdmin gets all
    conn.execute(text("""
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id FROM roles r, permissions p
        WHERE r.name = 'SuperAdmin'
        ON CONFLICT DO NOTHING;
    """))
    
    # Admin gets all except role management (role:create/edit/delete) to avoid privilege escalation
    admin_excluded = [("role", "create"), ("role", "edit"), ("role", "delete")]
    conn.execute(text("""
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id 
        FROM roles r, permissions p
        JOIN assets ast ON p.asset_id = ast.id
        JOIN actions a ON p.action_id = a.id
        WHERE r.name = 'Admin'
        ON CONFLICT DO NOTHING;
    """))
    for asset, act in admin_excluded:
        conn.execute(text(f"""
            DELETE FROM role_permissions
            WHERE role_id = (SELECT id FROM roles WHERE name = 'Admin')
            AND permission_id = (
                SELECT p.id FROM permissions p
                JOIN assets ast ON p.asset_id = ast.id
                JOIN actions a ON p.action_id = a.id
                WHERE ast.name = '{asset}' AND a.code = '{act}'
            );
        """))

    from app.core.config import settings
    from app.core.security import hash_password
    
    super_email = settings.SUPERADMIN_EMAIL
    super_password = hash_password(settings.SUPERADMIN_PASSWORD)
    
    # Seed SuperAdmin User
    conn.execute(
        text("""
            INSERT INTO users (id, email, hashed_password, account_status, user_type, name, user_id)
            VALUES (gen_random_uuid(), :email, :password, 'active', 'admin', 'Super Admin', 'superadmin')
            ON CONFLICT (email) DO UPDATE SET user_id = 'superadmin', hashed_password = :password;
        """),
        {"email": super_email, "password": super_password}
    )
    
    # Assign SuperAdmin Role to SuperAdmin User
    conn.execute(
        text("""
            INSERT INTO user_roles (user_id, role_id)
            SELECT u.id, r.id FROM users u, roles r
            WHERE u.email = :email AND r.name = 'SuperAdmin'
            ON CONFLICT DO NOTHING;
        """),
        {"email": super_email}
    )


def downgrade() -> None:
    """Downgrade schema."""
    pass
