"""seed_initial_data

Revision ID: 60a8fc13b106
Revises: 037080f54414
Create Date: 2026-09-21 12:36:53.025740

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text
from app.core.config import settings
from app.core.security import hash_password

# revision identifiers, used by Alembic.
revision: str = '60a8fc13b106'
down_revision: Union[str, Sequence[str], None] = '037080f54414'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    conn = op.get_bind()
    
    # Initial data for Courses and Departments has been moved to API scripts.
    # ==========================================
    # 2. RBAC ASSETS & ACTIONS
    # ==========================================
    assets = ["student_profile", "faculty_profile", "role", "notice", "complaint", "outpass", "timetable", "attendance", "mess", "system_setting", "department"]
    for asset in assets:
        conn.execute(text(f"INSERT INTO assets (id, name) VALUES (gen_random_uuid(), '{asset}') ON CONFLICT (name) DO NOTHING;"))
        
    actions = ["view", "list", "create", "edit", "delete", "approve", "reject", "resolve", "assign", "view_private", "manage", "mark", "feedback", "cancel"]
    for action in actions:
        conn.execute(text(f"INSERT INTO actions (id, code) VALUES (gen_random_uuid(), '{action}') ON CONFLICT (code) DO NOTHING;"))
        
    valid_perms = {
        "student_profile": ["view", "list", "create", "edit", "delete", "approve", "reject"],
        "faculty_profile": ["view", "list", "create", "edit", "delete", "approve", "reject"],
        "role": ["view", "list", "create", "edit", "delete", "approve", "reject"],
        "notice": ["view", "list", "create", "edit", "delete", "approve", "reject"],
        "complaint": ["view", "list", "create", "edit", "delete", "resolve", "assign", "view_private"],
        "outpass": ["create", "view", "cancel", "list", "approve", "reject"],
        "timetable": ["manage", "view"],
        "attendance": ["mark", "view"],
        "mess": ["manage", "view", "feedback"],
        "system_setting": ["manage", "view"],
        "department": ["manage", "view"]
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

    # ==========================================
    # 3. SYSTEM ROLES
    # ==========================================
    system_roles = [
        ('SuperAdmin', 'Unrestricted administrative access to all system modules.'),
        ('Admin', 'Administrative access excluding role management.'),
        ('HOD', 'Head of Department - administrative access within a specific department.'),
        ('Faculty', 'Default role for all active teaching staff members'),
        ('Non-Teaching Staff', 'Role for administrative and technical support staff (e.g., Lab Assistants)'),
        ('Support Staff', 'Role for maintenance, facilities, and general workers'),
        ('Student', 'Default role for all enrolled students')
    ]
    
    for r_name, r_desc in system_roles:
        conn.execute(text(f"""
            INSERT INTO roles (id, name, is_system_role, description) 
            VALUES (gen_random_uuid(), '{r_name}', true, '{r_desc}')
            ON CONFLICT (name) DO UPDATE SET is_system_role = true, description = '{r_desc}';
        """))

    # ==========================================
    # 4. ROLE PERMISSIONS ASSIGNMENTS
    # ==========================================
    # SuperAdmin: Gets ALL permissions
    conn.execute(text("""
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id FROM roles r, permissions p
        WHERE r.name = 'SuperAdmin'
        ON CONFLICT DO NOTHING;
    """))
    
    # Admin: Gets all permissions EXCEPT role management (create, edit, delete on 'role' asset)
    conn.execute(text("""
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id 
        FROM roles r, permissions p
        JOIN assets ast ON p.asset_id = ast.id
        JOIN actions a ON p.action_id = a.id
        WHERE r.name = 'Admin' 
        AND NOT (ast.name = 'role' AND a.code IN ('create', 'edit', 'delete'))
        ON CONFLICT DO NOTHING;
    """))

    # Student Permissions
    student_perms = [
        ("student_profile", ["view", "create", "edit"]),
        ("faculty_profile", ["view", "list"]),
        ("notice", ["view", "list"]),
        ("complaint", ["view", "list", "create"]),
        ("outpass", ["create", "view", "cancel"]),
        ("timetable", ["view"]),
        ("attendance", ["view"]),
        ("mess", ["view", "feedback"])
    ]
    
    for asset, acts in student_perms:
        for act in acts:
            conn.execute(text(f"""
                INSERT INTO role_permissions (role_id, permission_id)
                SELECT r.id, p.id 
                FROM roles r, permissions p
                JOIN assets ast ON p.asset_id = ast.id
                JOIN actions a ON p.action_id = a.id
                WHERE r.name = 'Student' AND ast.name = '{asset}' AND a.code = '{act}'
                ON CONFLICT DO NOTHING;
            """))
            
    # Faculty Permissions
    faculty_perms = [
        ("faculty_profile", ["view", "list", "create", "edit"]),
        ("student_profile", ["view", "list"]),
        ("notice", ["view", "list", "create", "edit", "delete"]),
        ("complaint", ["view", "list", "create", "resolve", "assign"]),
        ("outpass", ["view", "list", "approve", "reject"]),
        ("timetable", ["view"]),
        ("attendance", ["view", "mark"]),
        ("mess", ["view", "feedback"])
    ]
    
    for asset, acts in faculty_perms:
        for act in acts:
            conn.execute(text(f"""
                INSERT INTO role_permissions (role_id, permission_id)
                SELECT r.id, p.id 
                FROM roles r, permissions p
                JOIN assets ast ON p.asset_id = ast.id
                JOIN actions a ON p.action_id = a.id
                WHERE r.name = 'Faculty' AND ast.name = '{asset}' AND a.code = '{act}'
                ON CONFLICT DO NOTHING;
            """))

    # ==========================================
    # 5. DEFAULT SUPER ADMIN USER
    # ==========================================
    super_email = settings.SUPERADMIN_EMAIL
    super_password = hash_password(settings.SUPERADMIN_PASSWORD)
    
    conn.execute(
        text("""
            INSERT INTO users (id, email, hashed_password, account_status, user_type, name, user_id, email_notifications, in_app_alerts)
            VALUES (gen_random_uuid(), :email, :password, 'active', 'admin', 'Super Admin', 'superadmin', true, true)
            ON CONFLICT (email) DO UPDATE SET user_id = 'superadmin', hashed_password = :password;
        """),
        {"email": super_email, "password": super_password}
    )
    
    conn.execute(
        text("""
            INSERT INTO user_roles (user_id, role_id)
            SELECT u.id, r.id FROM users u, roles r
            WHERE u.email = :email AND r.name = 'SuperAdmin'
            ON CONFLICT DO NOTHING;
        """),
        {"email": super_email}
    )

    # ==========================================
    # 6. SYSTEM SETTINGS
    # ==========================================
    # Ensure backwards compatibility / upgrade for global_email_enabled
    conn.execute(text("""
        INSERT INTO system_settings (key, value, category, data_type, description, is_public) 
        VALUES ('global_email_enabled', 'true', 'Email', 'boolean', 'Master switch to enable or disable all outgoing emails.', false)
        ON CONFLICT (key) DO UPDATE SET category = 'Email', data_type = 'boolean', is_public = false;
    """))

    new_settings = [
        ('smtp_host', '127.0.0.1', 'Email', 'string', 'SMTP server hostname.', 'false'),
        ('smtp_port', '54325', 'Email', 'number', 'SMTP server port.', 'false'),
        ('smtp_user', 'mock', 'Email', 'string', 'SMTP username.', 'false'),
        ('smtp_password', 'mock', 'Email', 'password', 'SMTP password or API key.', 'false'),
        ('smtp_from_address', 'noreply@cms.edu', 'Email', 'string', 'Default sender email address.', 'false'),
        ('site_name', 'BPUT CMS', 'General', 'string', 'Name of the institution/site.', 'true'),
        ('site_url', 'http://localhost:3000', 'General', 'string', 'Public URL of the frontend.', 'true'),
        ('maintenance_mode', 'false', 'General', 'boolean', 'Enable maintenance mode to block non-admin users.', 'true'),
    ]
    
    for k, v, c, dt, desc, ip in new_settings:
        conn.execute(text(f"""
            INSERT INTO system_settings (key, value, category, data_type, description, is_public) 
            VALUES ('{k}', '{v}', '{c}', '{dt}', '{desc}', {ip})
            ON CONFLICT (key) DO NOTHING;
        """))

def downgrade() -> None:
    pass
