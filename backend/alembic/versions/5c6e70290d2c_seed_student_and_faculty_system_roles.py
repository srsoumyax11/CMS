"""seed_student_and_faculty_system_roles

Revision ID: 5c6e70290d2c
Revises: 4f4e97f972dd
Create Date: 2026-09-18 23:07:16.853900

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text


# revision identifiers, used by Alembic.
revision: str = '5c6e70290d2c'
down_revision: Union[str, Sequence[str], None] = '4f4e97f972dd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    conn.execute(text("""
        INSERT INTO roles (id, name, is_system_role, description) 
        VALUES (gen_random_uuid(), 'Student', true, 'Default role for all enrolled students')
        ON CONFLICT (name) DO UPDATE SET is_system_role = true, description = 'Default role for all enrolled students';
    """))
    conn.execute(text("""
        INSERT INTO roles (id, name, is_system_role, description) 
        VALUES (gen_random_uuid(), 'Faculty', true, 'Default role for all active faculty members')
        ON CONFLICT (name) DO UPDATE SET is_system_role = true, description = 'Default role for all active faculty members';
    """))

    # Seed permissions for Student
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

    # Seed permissions for Faculty
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


def downgrade() -> None:
    """Downgrade schema."""
    pass
