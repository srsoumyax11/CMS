"""remove_course_id_from_faculty_profiles

Revision ID: c5210fdae37d
Revises: 2de1f9788edc
Create Date: 2026-10-07 03:22:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'c5210fdae37d'
down_revision: Union[str, Sequence[str], None] = '2de1f9788edc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Drop course_id from faculty_profiles table."""
    op.execute("ALTER TABLE faculty_profiles DROP COLUMN IF EXISTS course_id CASCADE;")


def downgrade() -> None:
    """Re-add course_id to faculty_profiles table if needed."""
    op.add_column(
        'faculty_profiles',
        sa.Column('course_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('courses.id', ondelete='RESTRICT'), nullable=True)
    )
