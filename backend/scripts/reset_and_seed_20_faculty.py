import os
import sys
import asyncio
import uuid
from typing import List, Dict

sys.path.insert(0, r"d:\WebDev\CMS\backend")
from app.core.config import settings
from app.core.security import hash_password
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

# List of 20 Realistic Indian Professors
INDIAN_FACULTY_DATA: List[Dict[str, str]] = [
    {
        "name": "Dr. Ramesh Chandra Mohanty",
        "email": "prof.rc.mohanty@cms.edu",
        "department": "Computer Science & Engineering",
        "dept_code": "CSE",
        "course_name": "Computer Science & Engineering",
        "designation": "Professor & HOD",
        "phone": "+91 94370 12345"
    },
    {
        "name": "Prof. Sunita Pattnaik",
        "email": "prof.sunita.pattnaik@cms.edu",
        "department": "Computer Science & Engineering",
        "dept_code": "CSE",
        "course_name": "Computer Science & Engineering",
        "designation": "Associate Professor",
        "phone": "+91 98610 23456"
    },
    {
        "name": "Dr. Amitava Dasgupta",
        "email": "prof.amitava.das@cms.edu",
        "department": "Electrical Engineering",
        "dept_code": "EE",
        "course_name": "Electrical Engineering",
        "designation": "Professor",
        "phone": "+91 99371 34567"
    },
    {
        "name": "Prof. Priyadarshini Behera",
        "email": "prof.p.behera@cms.edu",
        "department": "Information Technology",
        "dept_code": "IT",
        "course_name": "Information Technology",
        "designation": "Assistant Professor",
        "phone": "+91 97760 45678"
    },
    {
        "name": "Dr. Subhashree Mishra",
        "email": "dean.academics@cms.edu",
        "department": "Computer Science & Engineering",
        "dept_code": "CSE",
        "course_name": "Computer Science & Engineering",
        "designation": "Dean of Academics & Senior Professor",
        "phone": "+91 94371 56789"
    },
    {
        "name": "Prof. Rajesh Kumar Nayak",
        "email": "prof.rk.nayak@cms.edu",
        "department": "Mechanical Engineering",
        "dept_code": "ME",
        "course_name": "Mechanical Engineering",
        "designation": "Associate Professor",
        "phone": "+91 98530 67890"
    },
    {
        "name": "Dr. Swati Sucharita Sahoo",
        "email": "prof.swati.sahoo@cms.edu",
        "department": "Electronics & Telecommunication",
        "dept_code": "ETC",
        "course_name": "Electronics & Telecommunication",
        "designation": "Assistant Professor",
        "phone": "+91 99380 78901"
    },
    {
        "name": "Prof. Bikram Keshari Rout",
        "email": "prof.bk.rout@cms.edu",
        "department": "Mechanical Engineering",
        "dept_code": "ME",
        "course_name": "Mechanical Engineering",
        "designation": "Professor & HOD",
        "phone": "+91 94380 89012"
    },
    {
        "name": "Dr. Tanmay Kumar Swain",
        "email": "prof.tanmay.swain@cms.edu",
        "department": "Civil Engineering",
        "dept_code": "CE",
        "course_name": "Civil Engineering",
        "designation": "Associate Professor",
        "phone": "+91 97770 90123"
    },
    {
        "name": "Prof. Anjali Roy Choudhury",
        "email": "prof.anjali.choudhury@cms.edu",
        "department": "Humanities & Management",
        "dept_code": "HUM",
        "course_name": "Humanities & Social Sciences",
        "designation": "Assistant Professor",
        "phone": "+91 98611 01234"
    },
    {
        "name": "Dr. Soumya Ranjan Samantaray",
        "email": "prof.sr.samantaray@cms.edu",
        "department": "Electrical Engineering",
        "dept_code": "EE",
        "course_name": "Electrical Engineering",
        "designation": "Associate Professor",
        "phone": "+91 94372 12345"
    },
    {
        "name": "Prof. Manisha Tripathy",
        "email": "prof.manisha.tripathy@cms.edu",
        "department": "Computer Science & Engineering",
        "dept_code": "CSE",
        "course_name": "Computer Science & Engineering",
        "designation": "Assistant Professor",
        "phone": "+91 98531 23456"
    },
    {
        "name": "Dr. Debasis Panigrahi",
        "email": "prof.debasis.panigrahi@cms.edu",
        "department": "Civil Engineering",
        "dept_code": "CE",
        "course_name": "Civil Engineering",
        "designation": "Professor & HOD",
        "phone": "+91 99372 34567"
    },
    {
        "name": "Prof. Archana Sengupta",
        "email": "prof.archana.sengupta@cms.edu",
        "department": "Basic Sciences",
        "dept_code": "BS",
        "course_name": "Applied Mathematics",
        "designation": "Assistant Professor",
        "phone": "+91 97780 45678"
    },
    {
        "name": "Dr. Pradeep Kumar Mahapatra",
        "email": "prof.pk.mahapatra@cms.edu",
        "department": "Basic Sciences",
        "dept_code": "BS",
        "course_name": "Applied Chemistry",
        "designation": "Professor",
        "phone": "+91 94373 56789"
    },
    {
        "name": "Prof. Ipsita Dash",
        "email": "prof.ipsita.dash@cms.edu",
        "department": "Information Technology",
        "dept_code": "IT",
        "course_name": "Information Technology",
        "designation": "Assistant Professor",
        "phone": "+91 98612 67890"
    },
    {
        "name": "Dr. Manoj Kumar Pradhan",
        "email": "prof.manoj.pradhan@cms.edu",
        "department": "Production Engineering",
        "dept_code": "PE",
        "course_name": "Production Engineering",
        "designation": "Associate Professor",
        "phone": "+91 99381 78901"
    },
    {
        "name": "Prof. Snigdha Mayee Jena",
        "email": "prof.snigdha.jena@cms.edu",
        "department": "Basic Sciences",
        "dept_code": "BS",
        "course_name": "Physics & Quantum Optics",
        "designation": "Assistant Professor",
        "phone": "+91 97790 89012"
    },
    {
        "name": "Dr. Alok Nath Parida",
        "email": "prof.an.parida@cms.edu",
        "department": "Electronics & Telecommunication",
        "dept_code": "ETC",
        "course_name": "Electronics & Telecommunication",
        "designation": "Professor & HOD",
        "phone": "+91 94374 90123"
    },
    {
        "name": "Prof. Kedar Nath Satapathy",
        "email": "prof.kn.satapathy@cms.edu",
        "department": "Basic Sciences",
        "dept_code": "BS",
        "course_name": "Applied Physics",
        "designation": "Associate Professor",
        "phone": "+91 98532 01234"
    }
]

DEFAULT_PASSWORD = "FacultyPassword@123"

async def reset_and_seed_faculty():
    engine = create_async_engine(settings.DATABASE_URL)
    hashed_pwd = hash_password(DEFAULT_PASSWORD)

    async with engine.begin() as conn:
        print("Connected to database. Purging existing faculty records...\n")

        # 1. Delete all existing faculty users
        del_res = await conn.execute(text("DELETE FROM users WHERE user_type = 'faculty'"))
        print(f"Purged old faculty users from database.")

        # 2. Fetch or create Faculty Role ID
        role_res = await conn.execute(text("SELECT id FROM roles WHERE name = 'Faculty'"))
        role_id = role_res.scalar()

        if not role_id:
            role_id = uuid.uuid4()
            await conn.execute(
                text("""
                    INSERT INTO roles (id, name, description, is_system_role, created_at, updated_at)
                    VALUES (:id, 'Faculty', 'Teaching staff and academic management.', TRUE, NOW(), NOW())
                """),
                {"id": role_id}
            )
            print(f"Created Faculty Role: {role_id}")
        else:
            print(f"Found Faculty Role ID: {role_id}")

        created_count = 0

        for idx, fac in enumerate(INDIAN_FACULTY_DATA, start=1):
            # A. Ensure Department Exists
            dept_res = await conn.execute(
                text("SELECT id FROM departments WHERE code = :code OR name = :name"),
                {"code": fac["dept_code"], "name": fac["department"]}
            )
            dept_id = dept_res.scalar()

            if not dept_id:
                dept_id = uuid.uuid4()
                await conn.execute(
                    text("""
                        INSERT INTO departments (id, name, code, is_active, created_at, updated_at)
                        VALUES (:id, :name, :code, TRUE, NOW(), NOW())
                    """),
                    {"id": dept_id, "name": fac["department"], "code": fac["dept_code"]}
                )

            # B. Ensure Course Exists
            course_res = await conn.execute(
                text("SELECT id FROM courses WHERE name = :name"),
                {"name": fac["course_name"]}
            )
            course_id = course_res.scalar()

            if not course_id:
                course_id = uuid.uuid4()
                await conn.execute(
                    text("""
                        INSERT INTO courses (id, name, duration_years, is_active, created_at, updated_at)
                        VALUES (:id, :name, 4, TRUE, NOW(), NOW())
                    """),
                    {
                        "id": course_id, 
                        "name": fac["course_name"]
                    }
                )

            # C. Create User Account
            user_id = uuid.uuid4()
            await conn.execute(
                text("""
                    INSERT INTO users (
                        id, email, hashed_password, account_status, user_type, name, 
                        phone, target_role, email_notifications, in_app_alerts, role_id, created_at, updated_at
                    )
                    VALUES (
                        :id, :email, :password, 'active', 'faculty', :name, 
                        :phone, 'Faculty', TRUE, TRUE, :role_id, NOW(), NOW()
                    )
                """),
                {
                    "id": user_id,
                    "email": fac["email"],
                    "password": hashed_pwd,
                    "name": fac["name"],
                    "phone": fac["phone"],
                    "role_id": role_id
                }
            )

            # D. Create Faculty Profile
            fac_prof_id = uuid.uuid4()
            await conn.execute(
                text("""
                    INSERT INTO faculty_profiles (
                        id, user_id, course_id, department_id, designation, 
                        employment_status, created_at, updated_at
                    )
                    VALUES (
                        :id, :user_id, :course_id, :dept_id, :designation, 
                        'active', NOW(), NOW()
                    )
                """),
                {
                    "id": fac_prof_id,
                    "user_id": user_id,
                    "course_id": course_id,
                    "dept_id": dept_id,
                    "designation": fac["designation"]
                }
            )

            created_count += 1
            print(f"[{idx}/20] Created Faculty: {fac['name']} ({fac['email']})")

        print("\n==========================================================")
        print(f"✅ SUCCESSFULLY PURGED & SEEDED EXACTLY 20 INDIAN PROFESSORS")
        print(f"   Total Fresh Faculty Accounts: {created_count}")
        print(f"   Default Login Password: {DEFAULT_PASSWORD}")
        print("==========================================================")

if __name__ == "__main__":
    asyncio.run(reset_and_seed_faculty())
