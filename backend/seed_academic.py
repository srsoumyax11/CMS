import asyncio
import os
import sys
from datetime import date
from sqlalchemy import select

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import AsyncSessionLocal
from app.models.academic import Department, Course, AcademicTerm, Subject, ClassGroup, Holiday

async def seed_academic():
    async with AsyncSessionLocal() as db:
        print("🌱 Seeding Academic & Administrative Infrastructure...")

        # 1. Departments (Academic + Administrative)
        departments = [
          # Academic Departments
          {"name": "Computer Science & Engineering", "code": "CSE", "department_type": "academic", "is_active": True},
          {"name": "Electronics & Communication Engineering", "code": "ECE", "department_type": "academic", "is_active": True},
          {"name": "Electrical Engineering", "code": "EE", "department_type": "academic", "is_active": True},
          {"name": "Mechanical Engineering", "code": "ME", "department_type": "academic", "is_active": True},
          {"name": "Civil Engineering", "code": "CE", "department_type": "academic", "is_active": True},
          {"name": "Information Technology", "code": "IT", "department_type": "academic", "is_active": True},
          {"name": "Basic Sciences & Humanities", "code": "BSH", "department_type": "academic", "is_active": True},
          
          # Non-Academic / Administrative Departments
          {"name": "Examination Cell", "code": "EXAM", "department_type": "administrative", "is_active": True},
          {"name": "Security & Campus Safety", "code": "SEC", "department_type": "administrative", "is_active": True},
          {"name": "Management & Administration", "code": "MGMT", "department_type": "administrative", "is_active": True},
          {"name": "Finance & Accounts", "code": "FIN", "department_type": "administrative", "is_active": True},
          {"name": "Training & Placement Cell", "code": "TPC", "department_type": "administrative", "is_active": True},
          {"name": "Hostel & Mess Management", "code": "HMM", "department_type": "administrative", "is_active": True},
          {"name": "Library & Knowledge Resource Center", "code": "LIBR", "department_type": "administrative", "is_active": True},
        ]

        dept_added = 0
        for dep in departments:
            stmt = select(Department).where(Department.code == dep["code"])
            res = await db.execute(stmt)
            if not res.scalar_one_or_none():
                db.add(Department(**dep))
                dept_added += 1

        await db.flush()

        # Build Department Code to ID Map
        dept_stmt = select(Department)
        all_depts = (await db.execute(dept_stmt)).scalars().all()
        dept_map = {d.code: d.id for d in all_depts}

        # 2. Degree Courses
        courses = [
            {"name": "Bachelor of Technology", "code": "BTECH", "duration_years": 4, "is_active": True},
            {"name": "Master of Technology", "code": "MTECH", "duration_years": 2, "is_active": True},
            {"name": "Master of Business Administration", "code": "MBA", "duration_years": 2, "is_active": True},
            {"name": "Master of Computer Applications", "code": "MCA", "duration_years": 2, "is_active": True},
            {"name": "Bachelor of Science (Honours)", "code": "BSC", "duration_years": 3, "is_active": True},
            {"name": "Doctor of Philosophy", "code": "PHD", "duration_years": 5, "is_active": True},
        ]

        course_added = 0
        for course in courses:
            stmt = select(Course).where(Course.code == course["code"])
            res = await db.execute(stmt)
            if not res.scalar_one_or_none():
                db.add(Course(**course))
                course_added += 1

        await db.flush()

        # Build Course Code to ID Map
        course_stmt = select(Course)
        all_courses = (await db.execute(course_stmt)).scalars().all()
        course_map = {c.code: c.id for c in all_courses}

        # 3. Academic Terms
        terms = [
            {"name": "Odd Semester 2026-27", "start_date": date(2026, 7, 15), "end_date": date(2026, 12, 20), "is_current": True},
            {"name": "Even Semester 2026-27", "start_date": date(2027, 1, 5), "end_date": date(2027, 5, 30), "is_current": False},
        ]

        term_added = 0
        for term in terms:
            stmt = select(AcademicTerm).where(AcademicTerm.name == term["name"])
            res = await db.execute(stmt)
            if not res.scalar_one_or_none():
                db.add(AcademicTerm(**term))
                term_added += 1

        # 4. Subjects (Comprehensive Catalog for B.Tech, M.Tech, MBA, MCA)
        subjects_data = [
            # CSE Subjects
            {"code": "CS101", "name": "Programming & Problem Solving in C", "dept_code": "CSE", "credits": 4},
            {"code": "CS201", "name": "Data Structures & Algorithms", "dept_code": "CSE", "credits": 4},
            {"code": "CS202", "name": "Object Oriented Programming with Java", "dept_code": "CSE", "credits": 3},
            {"code": "CS301", "name": "Database Management Systems", "dept_code": "CSE", "credits": 4},
            {"code": "CS302", "name": "Operating Systems & Architecture", "dept_code": "CSE", "credits": 4},
            {"code": "CS303", "name": "Computer Networks & Security", "dept_code": "CSE", "credits": 3},
            {"code": "CS401", "name": "Artificial Intelligence & Machine Learning", "dept_code": "CSE", "credits": 4},
            {"code": "CS402", "name": "Cloud Computing & DevOps", "dept_code": "CSE", "credits": 3},
            {"code": "CS501", "name": "Advanced Data Structures & Algorithms (M.Tech)", "dept_code": "CSE", "credits": 4},
            {"code": "CS502", "name": "Distributed Systems & Blockchain (M.Tech)", "dept_code": "CSE", "credits": 3},

            # ECE Subjects
            {"code": "EC101", "name": "Basic Electronics Engineering", "dept_code": "ECE", "credits": 3},
            {"code": "EC201", "name": "Digital Logic & Circuit Design", "dept_code": "ECE", "credits": 4},
            {"code": "EC202", "name": "Signals and Linear Systems", "dept_code": "ECE", "credits": 3},
            {"code": "EC301", "name": "Microprocessors & Microcontrollers", "dept_code": "ECE", "credits": 4},
            {"code": "EC302", "name": "VLSI Design & Semiconductor Physics", "dept_code": "ECE", "credits": 4},
            {"code": "EC401", "name": "Wireless Communications & 5G Networks", "dept_code": "ECE", "credits": 3},

            # EE Subjects
            {"code": "EE101", "name": "Basic Electrical Engineering", "dept_code": "EE", "credits": 3},
            {"code": "EE201", "name": "Electrical Machines & Transformers", "dept_code": "EE", "credits": 4},
            {"code": "EE301", "name": "Power Electronics & Drives", "dept_code": "EE", "credits": 4},
            {"code": "EE302", "name": "Control Systems Engineering", "dept_code": "EE", "credits": 3},

            # ME Subjects
            {"code": "ME101", "name": "Engineering Mechanics & Thermodynamics", "dept_code": "ME", "credits": 3},
            {"code": "ME201", "name": "Fluid Mechanics & Hydraulics", "dept_code": "ME", "credits": 4},
            {"code": "ME301", "name": "Heat Transfer & Thermal Engineering", "dept_code": "ME", "credits": 4},
            {"code": "ME401", "name": "Robotics & Industrial Automation", "dept_code": "ME", "credits": 3},

            # CE Subjects
            {"code": "CE101", "name": "Engineering Graphics & Surveying", "dept_code": "CE", "credits": 3},
            {"code": "CE201", "name": "Structural Analysis & Mechanics", "dept_code": "CE", "credits": 4},
            {"code": "CE301", "name": "Transportation & Highway Engineering", "dept_code": "CE", "credits": 3},

            # BSH Subjects
            {"code": "BS101", "name": "Engineering Mathematics I", "dept_code": "BSH", "credits": 4},
            {"code": "BS102", "name": "Engineering Physics & Optics", "dept_code": "BSH", "credits": 3},
            {"code": "BS103", "name": "Engineering Chemistry & Materials Science", "dept_code": "BSH", "credits": 3},
            {"code": "HU101", "name": "Professional Communication & Ethics", "dept_code": "BSH", "credits": 2},
        ]

        subject_added = 0
        for sub in subjects_data:
            dept_code = str(sub["dept_code"])
            dept_id = dept_map.get(dept_code)
            if dept_id:
                sub_code = str(sub["code"])
                sub_name = str(sub["name"])
                sub_credits = int(sub["credits"])
                stmt = select(Subject).where(Subject.code == sub_code)
                res = await db.execute(stmt)
                if not res.scalar_one_or_none():
                    db.add(Subject(
                        code=sub_code,
                        name=sub_name,
                        department_id=dept_id,
                        credits=sub_credits,
                        status=True
                    ))
                    subject_added += 1

        # 5. Class Group Cohorts
        cohorts_data = [
            {"course_code": "BTECH", "dept_code": "CSE", "year": 1, "section": "A"},
            {"course_code": "BTECH", "dept_code": "CSE", "year": 1, "section": "B"},
            {"course_code": "BTECH", "dept_code": "CSE", "year": 2, "section": "A"},
            {"course_code": "BTECH", "dept_code": "CSE", "year": 3, "section": "A"},
            {"course_code": "BTECH", "dept_code": "ECE", "year": 1, "section": "A"},
            {"course_code": "BTECH", "dept_code": "ECE", "year": 2, "section": "A"},
            {"course_code": "BTECH", "dept_code": "ME", "year": 1, "section": "A"},
            {"course_code": "MTECH", "dept_code": "CSE", "year": 1, "section": "A"},
            {"course_code": "MCA", "dept_code": "CSE", "year": 1, "section": "A"},
            {"course_code": "MBA", "dept_code": "MGMT", "year": 1, "section": "A"},
        ]

        cg_added = 0
        for cg in cohorts_data:
            c_code = str(cg["course_code"])
            d_code = str(cg["dept_code"])
            c_id = course_map.get(c_code)
            d_id = dept_map.get(d_code)
            if c_id and d_id:
                cg_year = int(cg["year"])
                cg_section = str(cg["section"])
                stmt = select(ClassGroup).where(
                    ClassGroup.course_id == c_id,
                    ClassGroup.department_id == d_id,
                    ClassGroup.year == cg_year,
                    ClassGroup.section == cg_section
                )
                res = await db.execute(stmt)
                if not res.scalar_one_or_none():
                    db.add(ClassGroup(
                        course_id=c_id,
                        department_id=d_id,
                        year=cg_year,
                        section=cg_section,
                        status=True
                    ))
                    cg_added += 1

        # 6. Holidays
        holidays = [
            {"name": "Independence Day", "date": date(2026, 8, 15), "applies_to": None},
            {"name": "Gandhi Jayanti", "date": date(2026, 10, 2), "applies_to": None},
            {"name": "Diwali Vacation", "date": date(2026, 11, 8), "applies_to": None},
            {"name": "New Year Day", "date": date(2027, 1, 1), "applies_to": None},
            {"name": "Republic Day", "date": date(2027, 1, 26), "applies_to": None},
        ]

        hol_added = 0
        for hol in holidays:
            stmt = select(Holiday).where(Holiday.name == hol["name"], Holiday.date == hol["date"])
            res = await db.execute(stmt)
            if not res.scalar_one_or_none():
                db.add(Holiday(**hol))
                hol_added += 1

        await db.commit()
        print(f"✅ Seeded {dept_added} Departments, {course_added} Courses, {term_added} Terms, {subject_added} Subjects, {cg_added} Cohorts, and {hol_added} Holidays.")

if __name__ == "__main__":
    asyncio.run(seed_academic())
