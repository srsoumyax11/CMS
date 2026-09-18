"""seed_reference_data

Revision ID: f8b91939f1e5
Revises: 921af6e0c249
Create Date: 2026-09-17 20:26:25.280146

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text


# revision identifiers, used by Alembic.
revision: str = 'f8b91939f1e5'
down_revision: Union[str, Sequence[str], None] = '921af6e0c249'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    
    # 1. Academic Data
    conn.execute(text("""
        INSERT INTO courses (id, name, is_active) VALUES 
        ('13408608-0072-4669-bc98-87013c5252b0', 'B.Tech', true),
        ('95f0113c-cc83-4c91-9e8c-8be94f576eec', 'M.Tech', true),
        ('677cd2f7-bc6d-495d-ab9a-36bdf483b2bb', 'Ph.D', true)
        ON CONFLICT (id) DO NOTHING;
    """))
    
    branches = [
        ('CSE', '13408608-0072-4669-bc98-87013c5252b0'),
        ('ECE', '13408608-0072-4669-bc98-87013c5252b0'),
        ('ME', '13408608-0072-4669-bc98-87013c5252b0'),
        ('CE', '13408608-0072-4669-bc98-87013c5252b0'),
        ('EE', '13408608-0072-4669-bc98-87013c5252b0'),
        ('IT', '13408608-0072-4669-bc98-87013c5252b0'),
        ('Computer Science', '95f0113c-cc83-4c91-9e8c-8be94f576eec'),
        ('VLSI', '95f0113c-cc83-4c91-9e8c-8be94f576eec'),
        ('Thermal Engineering', '95f0113c-cc83-4c91-9e8c-8be94f576eec')
    ]
    
    for b_name, c_id in branches:
        conn.execute(text(f"""
            INSERT INTO branches (id, name, course_id, is_active)
            SELECT gen_random_uuid(), '{b_name}', '{c_id}', true
            WHERE NOT EXISTS (
                SELECT 1 FROM branches WHERE name = '{b_name}' AND course_id = '{c_id}'
            );
        """))

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

    # Seed SuperAdmin User
    conn.execute(text("""
        INSERT INTO users (id, email, hashed_password, is_active, user_type, name)
        VALUES (gen_random_uuid(), 'admin@example.com', '$2b$12$OnqaMxmsJiy1UhLbAenxjO8dj/etxgUjWWaSq/oih3boMH91YJjkq', true, 'admin', 'Super Admin')
        ON CONFLICT (email) DO NOTHING;
    """))
    
    # Assign SuperAdmin Role to SuperAdmin User
    conn.execute(text("""
        INSERT INTO user_roles (user_id, role_id)
        SELECT u.id, r.id FROM users u, roles r
        WHERE u.email = 'admin@example.com' AND r.name = 'SuperAdmin'
        ON CONFLICT DO NOTHING;
    """))

def downgrade() -> None:
    pass
