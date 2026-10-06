"""
Main Test Execution File for Course, Department, and Faculty Seeding & Verification.

Usage:
    python -m test.main
"""

import asyncio
import logging
import sys
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.models.academic import Course, Department
from app.models.user import User, UserType
from app.models.profiles import FacultyProfile
from test.create_course import create_course
from test.create_department import create_department
from test.create_faculty import create_faculty
from test.course_data import COURSES_DATA
from test.department_data import ALL_DEPARTMENTS
from test.faculty_data import FACULTY_DATA

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)


async def run_course_seeder(session: AsyncSession):
    """
    Executes course seeding by calling create_course for each course definition.
    """
    logger.info("--- Starting Course Creation Routine ---")
    created_courses = []

    for course_item in COURSES_DATA:
        course_obj = await create_course(
            session=session,
            code=course_item["code"],
            name=course_item["name"],
            duration_years=course_item["duration_years"],
            is_active=course_item.get("is_active", True),
        )
        created_courses.append(course_obj)

    await session.commit()
    logger.info(f"✅ Successfully processed {len(created_courses)} courses.\n")


async def run_department_seeder(session: AsyncSession):
    """
    Executes department seeding by calling create_department for each department definition.
    """
    logger.info("--- Starting Department Creation Routine ---")
    created_depts = []

    for dept in ALL_DEPARTMENTS:
        department_obj = await create_department(
            session=session,
            code=dept["code"],
            name=dept["name"],
            department_type=dept["department_type"],
            is_active=dept.get("is_active", True),
        )
        created_depts.append(department_obj)

    await session.commit()
    logger.info(f"✅ Successfully processed {len(created_depts)} departments.\n")


async def run_faculty_seeder(session: AsyncSession):
    """
    Executes faculty seeding by calling create_faculty for each faculty definition.
    """
    logger.info("--- Starting Faculty Creation Routine ---")
    created_faculty = []

    for fac in FACULTY_DATA:
        faculty_user = await create_faculty(
            session=session,
            name=fac["name"],
            email=fac["email"],
            password=fac["password"],
            department_code=fac["department_code"],
            designation=fac["designation"],
        )
        created_faculty.append(faculty_user)

    await session.commit()
    logger.info(f"✅ Successfully processed {len(created_faculty)} faculty members.\n")


async def print_seeding_report(session: AsyncSession):
    """
    Queries and prints a formatted summary report of all courses, departments, and faculty in the DB.
    """
    # Query Courses
    stmt_courses = select(Course).order_by(Course.code)
    res_courses = await session.execute(stmt_courses)
    courses = res_courses.scalars().all()

    # Query Departments
    stmt_depts = select(Department).order_by(Department.department_type, Department.code)
    res_depts = await session.execute(stmt_depts)
    departments = res_depts.scalars().all()

    # Query Faculty Users with Profile & Department
    stmt_fac = (
        select(User)
        .where(User.user_type == UserType.faculty)
        .options(
            selectinload(User.faculty_profile).selectinload(FacultyProfile.department)
        )
        .order_by(User.name)
    )
    res_fac = await session.execute(stmt_fac)
    faculties = res_fac.scalars().all()

    academic_depts = [d for d in departments if d.department_type == "academic"]
    admin_depts = [d for d in departments if d.department_type == "administrative"]

    print("\n" + "=" * 80)
    print("                 ACADEMIC & SYSTEM SEEDING SUMMARY REPORT                ")
    print("=" * 80)

    print(f"\n📚 DEGREE COURSES ({len(courses)} Total):")
    print("-" * 80)
    print(f"{'CODE':<10} | {'COURSE NAME':<45} | {'DURATION':<10} | {'STATUS':<10}")
    print("-" * 80)
    for crs in courses:
        status = "Active 🟢" if crs.is_active else "Inactive 🔴"
        duration_str = f"{crs.duration_years} Years"
        print(f"{crs.code:<10} | {crs.name:<45} | {duration_str:<10} | {status:<10}")

    print(f"\n🎓 ACADEMIC DEPARTMENTS ({len(academic_depts)} Total):")
    print("-" * 80)
    print(f"{'CODE':<10} | {'DEPARTMENT NAME':<45} | {'TYPE':<12} | {'STATUS':<10}")
    print("-" * 80)
    for dept in academic_depts:
        status = "Active 🟢" if dept.is_active else "Inactive 🔴"
        print(f"{dept.code:<10} | {dept.name:<45} | {dept.department_type:<12} | {status:<10}")

    print(f"\n🏢 ADMINISTRATIVE DEPARTMENTS ({len(admin_depts)} Total):")
    print("-" * 80)
    print(f"{'CODE':<10} | {'DEPARTMENT NAME':<45} | {'TYPE':<12} | {'STATUS':<10}")
    print("-" * 80)
    for dept in admin_depts:
        status = "Active 🟢" if dept.is_active else "Inactive 🔴"
        print(f"{dept.code:<10} | {dept.name:<45} | {dept.department_type:<12} | {status:<10}")

    print(f"\n👨‍🏫 FACULTY MEMBERS ({len(faculties)} Total):")
    print("-" * 80)
    print(f"{'NAME':<28} | {'EMAIL':<28} | {'DEPT':<8} | {'DESIGNATION':<25}")
    print("-" * 80)
    for f in faculties:
        dept_code = f.faculty_profile.department.code if (f.faculty_profile and f.faculty_profile.department) else "N/A"
        desig = f.faculty_profile.designation if f.faculty_profile else "N/A"
        print(f"{f.name:<28} | {f.email:<28} | {dept_code:<8} | {desig:<25}")

    print("\n" + "=" * 80)
    print(f" TOTAL COURSES: {len(courses)}  |  DEPARTMENTS: {len(departments)}  |  FACULTY: {len(faculties)}")
    print("=" * 80 + "\n")


async def main():
    """Main entrypoint for test execution."""
    logger.info("Opening async database session...")
    async with AsyncSessionLocal() as session:
        await run_course_seeder(session)
        await run_department_seeder(session)
        await run_faculty_seeder(session)
        await print_seeding_report(session)


if __name__ == "__main__":
    asyncio.run(main())
