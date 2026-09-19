"""seed_academic_reference_data

Revision ID: 733293a5f90d
Revises: 55d07001e926
Create Date: 2026-09-18 23:07:15.036478

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text


# revision identifiers, used by Alembic.
revision: str = '733293a5f90d'
down_revision: Union[str, Sequence[str], None] = '55d07001e926'
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


def downgrade() -> None:
    """Downgrade schema."""
    pass
