from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.academic import Department, Course

async def seed_academic(db: AsyncSession):
    print("📌 Seeding Academic Departments & Courses...")
    dept_data = [
        ("CSE", "Department of Computer Science & Engineering", "academic"),
        ("ECE", "Department of Electronics & Communication Engineering", "academic"),
        ("EE", "Department of Electrical Engineering", "academic"),
        ("ME", "Department of Mechanical Engineering", "academic"),
        ("CE", "Department of Civil Engineering", "academic"),
    ]
    dept_dict = {}
    for code, name, d_type in dept_data:
        res = await db.execute(select(Department).where(Department.code == code))
        d_obj = res.scalars().first()
        if not d_obj:
            d_obj = Department(code=code, name=name, department_type=d_type)
            db.add(d_obj)
            await db.flush()
        dept_dict[code] = d_obj

    course_data = [
        ("B.Tech in Computer Science & Engineering", 4),
        ("B.Tech in Electronics & Communication", 4),
        ("B.Tech in Mechanical Engineering", 4),
        ("M.Tech in Software Engineering", 2),
        ("Master of Business Administration", 2),
    ]
    course_dict = {}
    for c_name, duration in course_data:
        res = await db.execute(select(Course).where(Course.name == c_name))
        c_obj = res.scalars().first()
        if not c_obj:
            c_obj = Course(name=c_name, duration_years=duration, is_active=True)
            db.add(c_obj)
            await db.flush()
        course_dict[c_name] = c_obj

    return dept_dict, course_dict
