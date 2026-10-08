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
    now = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)

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

    # Seed Admin User from environment config
    import uuid
    from app.core.config import settings
    from app.core.security import hash_password

    admin_email = settings.SUPERADMIN_EMAIL or "superadmin@cms.com"
    admin_password = settings.SUPERADMIN_PASSWORD or "Super+Admin@123"
    admin_role_id = '00000000-0000-0000-0000-000000000001'
    admin_id = str(uuid.uuid4())
    hashed_pwd = hash_password(admin_password)

    op.execute(
        f"""
        INSERT INTO users (id, email, hashed_password, name, user_type, account_status, role_id, email_notifications, in_app_alerts, is_2fa_enabled, created_at, updated_at)
        VALUES (
            '{admin_id}', 
            '{admin_email}', 
            '{hashed_pwd}', 
            'System Administrator', 
            'admin'::user_type_enum, 
            'active'::account_status_enum, 
            '{admin_role_id}',
            true,
            true,
            false,
            NOW(), 
            NOW()
        );
        """
    )

    # Seed System Settings
    system_settings_table = sa.table('system_settings',
        sa.column('key', sa.String),
        sa.column('value', sa.String),
        sa.column('category', sa.String),
        sa.column('data_type', sa.String),
        sa.column('description', sa.String),
        sa.column('is_public', sa.Boolean),
        sa.column('created_at', sa.DateTime),
        sa.column('updated_at', sa.DateTime)
    )

    settings_data = [
        {'key': 'smtp_host', 'value': '127.0.0.1', 'category': 'Email', 'data_type': 'string', 'description': 'SMTP Server Host', 'is_public': False, 'created_at': now, 'updated_at': now},
        {'key': 'smtp_port', 'value': '54325', 'category': 'Email', 'data_type': 'integer', 'description': 'SMTP Server Port', 'is_public': False, 'created_at': now, 'updated_at': now},
        {'key': 'global_email_enabled', 'value': 'true', 'category': 'Email', 'data_type': 'boolean', 'description': 'Enable/Disable Emails Globally', 'is_public': False, 'created_at': now, 'updated_at': now},
        {'key': 'site_name', 'value': 'Campus Management System', 'category': 'General', 'data_type': 'string', 'description': 'Name of the institution', 'is_public': True, 'created_at': now, 'updated_at': now},
        {'key': 'maintenance_mode', 'value': 'false', 'category': 'System', 'data_type': 'boolean', 'description': 'Put the system in maintenance mode', 'is_public': True, 'created_at': now, 'updated_at': now},
        {'key': 'max_upload_size_mb', 'value': '10', 'category': 'Uploads', 'data_type': 'integer', 'description': 'Maximum upload file size in MB', 'is_public': True, 'created_at': now, 'updated_at': now}
    ]
    
    op.bulk_insert(system_settings_table, settings_data)

    # --- Seed Permissions from Perms ---
    from app.core.permissions import Perms
    
    # Extract unique assets and actions
    perms_dict = {k: v for k, v in Perms.__dict__.items() if not k.startswith('__') and isinstance(v, str) and ':' in v}
    
    asset_names = set()
    action_codes = set()
    for v in perms_dict.values():
        asset, action = v.split(':')
        asset_names.add(asset)
        action_codes.add(action)
        
    assets_data = {name: str(uuid.uuid4()) for name in asset_names}
    actions_data = {code: str(uuid.uuid4()) for code in action_codes}
    
    assets_table = sa.table('assets', sa.column('id', sa.UUID), sa.column('name', sa.String))
    op.bulk_insert(assets_table, [{'id': assets_data[name], 'name': name} for name in asset_names])
    
    actions_table = sa.table('actions', sa.column('id', sa.UUID), sa.column('code', sa.String))
    op.bulk_insert(actions_table, [{'id': actions_data[code], 'code': code} for code in action_codes])
    
    permissions_table = sa.table('permissions', sa.column('id', sa.UUID), sa.column('asset_id', sa.UUID), sa.column('action_id', sa.UUID))
    
    perms_map = {}
    perms_insert = []
    for v in perms_dict.values():
        asset, action = v.split(':')
        perm_id = str(uuid.uuid4())
        perms_map[v] = perm_id
        perms_insert.append({'id': perm_id, 'asset_id': assets_data[asset], 'action_id': actions_data[action]})
        
    op.bulk_insert(permissions_table, perms_insert)
    
    role_permissions_table = sa.table('role_permissions', sa.column('role_id', sa.UUID), sa.column('permission_id', sa.UUID))
    
    faculty_role_id = '00000000-0000-0000-0000-000000000002'
    student_role_id = '00000000-0000-0000-0000-000000000003'
    staff_role_id = '00000000-0000-0000-0000-000000000004'
    
    # Define which role gets which permissions
    role_perms_insert = []
    
    # Admin gets all
    for perm_id in perms_map.values():
        role_perms_insert.append({'role_id': admin_role_id, 'permission_id': perm_id})
        
    # Student permissions
    student_perms = [
        Perms.STUDENT_PROFILE_VIEW,
        Perms.STUDENT_PROFILE_EDIT,
        Perms.NOTICE_VIEW,
        Perms.NOTICE_LIST,
        Perms.COMPLAINT_VIEW,
        Perms.COMPLAINT_LIST,
        Perms.COMPLAINT_CREATE,
    ]
    for p in student_perms:
        if p in perms_map:
            role_perms_insert.append({'role_id': student_role_id, 'permission_id': perms_map[p]})
            
    # Faculty permissions
    faculty_perms = [
        Perms.FACULTY_PROFILE_VIEW,
        Perms.FACULTY_PROFILE_EDIT,
        Perms.STUDENT_PROFILE_VIEW,
        Perms.STUDENT_PROFILE_LIST,
        Perms.NOTICE_VIEW,
        Perms.NOTICE_LIST,
        Perms.NOTICE_CREATE,
        Perms.COMPLAINT_VIEW,
        Perms.COMPLAINT_LIST,
        Perms.COMPLAINT_VIEW_PRIVATE,
    ]
    for p in faculty_perms:
        if p in perms_map:
            role_perms_insert.append({'role_id': faculty_role_id, 'permission_id': perms_map[p]})
            
    # Staff permissions
    staff_perms = [
        Perms.STAFF_PROFILE_VIEW,
        Perms.STAFF_PROFILE_EDIT,
        Perms.NOTICE_VIEW,
        Perms.NOTICE_LIST,
        Perms.COMPLAINT_VIEW,
        Perms.COMPLAINT_LIST,
        Perms.COMPLAINT_RESOLVE,
    ]
    for p in staff_perms:
        if p in perms_map:
            role_perms_insert.append({'role_id': staff_role_id, 'permission_id': perms_map[p]})
            
    op.bulk_insert(role_permissions_table, role_perms_insert)

    # --- Seed Courses ---
    courses_table = sa.table('courses',
        sa.column('id', sa.UUID),
        sa.column('code', sa.String),
        sa.column('name', sa.String),
        sa.column('duration_years', sa.Integer),
        sa.column('is_active', sa.Boolean),
        sa.column('created_at', sa.DateTime),
        sa.column('updated_at', sa.DateTime)
    )
    courses_data = [
        {'id': str(uuid.uuid4()), 'code': 'BTECH', 'name': 'Bachelor of Technology', 'duration_years': 4, 'is_active': True, 'created_at': now, 'updated_at': now},
        {'id': str(uuid.uuid4()), 'code': 'MTECH', 'name': 'Master of Technology', 'duration_years': 2, 'is_active': True, 'created_at': now, 'updated_at': now},
        {'id': str(uuid.uuid4()), 'code': 'BARCH', 'name': 'Bachelor of Architecture', 'duration_years': 5, 'is_active': True, 'created_at': now, 'updated_at': now},
        {'id': str(uuid.uuid4()), 'code': 'MARCH', 'name': 'Master of Architecture', 'duration_years': 2, 'is_active': True, 'created_at': now, 'updated_at': now},
        {'id': str(uuid.uuid4()), 'code': 'BPHARM', 'name': 'Bachelor of Pharmacy', 'duration_years': 4, 'is_active': True, 'created_at': now, 'updated_at': now},
        {'id': str(uuid.uuid4()), 'code': 'MPHARM', 'name': 'Master of Pharmacy', 'duration_years': 2, 'is_active': True, 'created_at': now, 'updated_at': now},
        {'id': str(uuid.uuid4()), 'code': 'MBA', 'name': 'Master of Business Administration', 'duration_years': 2, 'is_active': True, 'created_at': now, 'updated_at': now},
        {'id': str(uuid.uuid4()), 'code': 'MCA', 'name': 'Master of Computer Applications', 'duration_years': 2, 'is_active': True, 'created_at': now, 'updated_at': now},
        {'id': str(uuid.uuid4()), 'code': 'BSC', 'name': 'Bachelor of Science', 'duration_years': 3, 'is_active': True, 'created_at': now, 'updated_at': now},
        {'id': str(uuid.uuid4()), 'code': 'MSC', 'name': 'Master of Science', 'duration_years': 2, 'is_active': True, 'created_at': now, 'updated_at': now},
        {'id': str(uuid.uuid4()), 'code': 'PHD', 'name': 'Doctor of Philosophy', 'duration_years': 3, 'is_active': True, 'created_at': now, 'updated_at': now},
    ]
    op.bulk_insert(courses_table, courses_data)

    # --- Seed Departments ---
    departments_table = sa.table('departments',
        sa.column('id', sa.UUID),
        sa.column('code', sa.String),
        sa.column('name', sa.String),
        sa.column('department_type', sa.String), # Using string instead of enum to bypass postgres enum casting issues in alembic
        sa.column('is_active', sa.Boolean),
        sa.column('created_at', sa.DateTime),
        sa.column('updated_at', sa.DateTime)
    )
    departments_data = [
        {'id': str(uuid.uuid4()), 'code': 'CSE', 'name': 'Computer Science & Engineering', 'department_type': 'academic', 'is_active': True, 'created_at': now, 'updated_at': now},
        {'id': str(uuid.uuid4()), 'code': 'ECE', 'name': 'Electronics & Communication Engineering', 'department_type': 'academic', 'is_active': True, 'created_at': now, 'updated_at': now},
        {'id': str(uuid.uuid4()), 'code': 'EE', 'name': 'Electrical Engineering', 'department_type': 'academic', 'is_active': True, 'created_at': now, 'updated_at': now},
        {'id': str(uuid.uuid4()), 'code': 'ME', 'name': 'Mechanical Engineering', 'department_type': 'academic', 'is_active': True, 'created_at': now, 'updated_at': now},
        {'id': str(uuid.uuid4()), 'code': 'CE', 'name': 'Civil Engineering', 'department_type': 'academic', 'is_active': True, 'created_at': now, 'updated_at': now},
        {'id': str(uuid.uuid4()), 'code': 'CHE', 'name': 'Chemical Engineering', 'department_type': 'academic', 'is_active': True, 'created_at': now, 'updated_at': now},
        {'id': str(uuid.uuid4()), 'code': 'IT', 'name': 'Information Technology', 'department_type': 'academic', 'is_active': True, 'created_at': now, 'updated_at': now},
        {'id': str(uuid.uuid4()), 'code': 'BSH', 'name': 'Basic Sciences & Humanities', 'department_type': 'academic', 'is_active': True, 'created_at': now, 'updated_at': now},
        {'id': str(uuid.uuid4()), 'code': 'SEC', 'name': 'Campus Security & Vigilance', 'department_type': 'administrative', 'is_active': True, 'created_at': now, 'updated_at': now},
        {'id': str(uuid.uuid4()), 'code': 'ACC', 'name': 'Accounts & Finance Division', 'department_type': 'administrative', 'is_active': True, 'created_at': now, 'updated_at': now},
        {'id': str(uuid.uuid4()), 'code': 'MGT', 'name': 'Executive Management & Governance', 'department_type': 'administrative', 'is_active': True, 'created_at': now, 'updated_at': now},
        {'id': str(uuid.uuid4()), 'code': 'ADM', 'name': 'General Administration & HR', 'department_type': 'administrative', 'is_active': True, 'created_at': now, 'updated_at': now},
        {'id': str(uuid.uuid4()), 'code': 'EXM', 'name': 'Examination & Evaluation Cell', 'department_type': 'administrative', 'is_active': True, 'created_at': now, 'updated_at': now},
        {'id': str(uuid.uuid4()), 'code': 'LIB', 'name': 'Central Library Services', 'department_type': 'administrative', 'is_active': True, 'created_at': now, 'updated_at': now},
    ]
    # Use direct SQL for enum columns to avoid casting issues in Alembic
    for dept in departments_data:
        op.execute(
            f"INSERT INTO departments (id, code, name, department_type, is_active, created_at, updated_at) "
            f"VALUES ('{dept['id']}', '{dept['code']}', '{dept['name']}', '{dept['department_type']}'::departmenttype, {str(dept['is_active']).lower()}, NOW(), NOW());"
        )


def downgrade() -> None:
    pass
