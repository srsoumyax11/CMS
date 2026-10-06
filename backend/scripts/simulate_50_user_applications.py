import os
import sys
import asyncio
import uuid
import random
import json
from typing import List, Dict, Any

# Ensure backend root is on sys.path
sys.path.insert(0, r"d:\WebDev\CMS\backend")
from app.core.config import settings
from app.core.security import hash_password
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

# Realistic Indian Applicant Pool (50 Applications)
APPLICANTS_DATA: List[Dict[str, Any]] = [
    # --- STUDENTS (25 Applicants) ---
    {"name": "Aarav Sharma", "email": "aarav.sharma.cse@cms.edu", "target_role": "student", "dept_code": "CSE", "course_name": "Computer Science & Engineering", "year": 1},
    {"name": "Ananya Pattnaik", "email": "ananya.pattnaik.cse@cms.edu", "target_role": "student", "dept_code": "CSE", "course_name": "Computer Science & Engineering", "year": 2},
    {"name": "Rohan Mohanty", "email": "rohan.mohanty.ee@cms.edu", "target_role": "student", "dept_code": "EE", "course_name": "Electrical Engineering", "year": 1},
    {"name": "Priya Das", "email": "priya.das.it@cms.edu", "target_role": "student", "dept_code": "IT", "course_name": "Information Technology", "year": 3},
    {"name": "Siddharth Swain", "email": "siddharth.swain.me@cms.edu", "target_role": "student", "dept_code": "ME", "course_name": "Mechanical Engineering", "year": 2},
    {"name": "Ishita Behera", "email": "ishita.behera.ce@cms.edu", "target_role": "student", "dept_code": "CE", "course_name": "Civil Engineering", "year": 4},
    {"name": "Ayush Mishra", "email": "ayush.mishra.cse@cms.edu", "target_role": "student", "dept_code": "CSE", "course_name": "Computer Science & Engineering", "year": 1},
    {"name": "Sneha Sahoo", "email": "sneha.sahoo.etc@cms.edu", "target_role": "student", "dept_code": "ETC", "course_name": "Electronics & Telecommunication", "year": 2},
    {"name": "Devansh Rout", "email": "devansh.rout.ee@cms.edu", "target_role": "student", "dept_code": "EE", "course_name": "Electrical Engineering", "year": 3},
    {"name": "Kavya Tripathy", "email": "kavya.tripathy.it@cms.edu", "target_role": "student", "dept_code": "IT", "course_name": "Information Technology", "year": 1},
    {"name": "Aditya Nayak", "email": "aditya.nayak.me@cms.edu", "target_role": "student", "dept_code": "ME", "course_name": "Mechanical Engineering", "year": 4},
    {"name": "Diya Samantaray", "email": "diya.samantaray.cse@cms.edu", "target_role": "student", "dept_code": "CSE", "course_name": "Computer Science & Engineering", "year": 2},
    {"name": "Kabir Panigrahi", "email": "kabir.panigrahi.ce@cms.edu", "target_role": "student", "dept_code": "CE", "course_name": "Civil Engineering", "year": 1},
    {"name": "Riya Sengupta", "email": "riya.sengupta.etc@cms.edu", "target_role": "student", "dept_code": "ETC", "course_name": "Electronics & Telecommunication", "year": 3},
    {"name": "Manav Mahapatra", "email": "manav.mahapatra.pe@cms.edu", "target_role": "student", "dept_code": "PE", "course_name": "Production Engineering", "year": 2},
    {"name": "Tanvi Dash", "email": "tanvi.dash.cse@cms.edu", "target_role": "student", "dept_code": "CSE", "course_name": "Computer Science & Engineering", "year": 1},
    {"name": "Varun Jena", "email": "varun.jena.ee@cms.edu", "target_role": "student", "dept_code": "EE", "course_name": "Electrical Engineering", "year": 2},
    {"name": "Shreya Parida", "email": "shreya.parida.it@cms.edu", "target_role": "student", "dept_code": "IT", "course_name": "Information Technology", "year": 4},
    {"name": "Nikhil Satapathy", "email": "nikhil.satapathy.me@cms.edu", "target_role": "student", "dept_code": "ME", "course_name": "Mechanical Engineering", "year": 3},
    {"name": "Meera Choudhury", "email": "meera.choudhury.ce@cms.edu", "target_role": "student", "dept_code": "CE", "course_name": "Civil Engineering", "year": 1},
    {"name": "Yash Vardhan", "email": "yash.vardhan.cse@cms.edu", "target_role": "student", "dept_code": "CSE", "course_name": "Computer Science & Engineering", "year": 2},
    {"name": "Prachi Pradhan", "email": "prachi.pradhan.etc@cms.edu", "target_role": "student", "dept_code": "ETC", "course_name": "Electronics & Telecommunication", "year": 1},
    {"name": "Harsh Raj", "email": "harsh.raj.ee@cms.edu", "target_role": "student", "dept_code": "EE", "course_name": "Electrical Engineering", "year": 3},
    {"name": "Pooja Roy", "email": "pooja.roy.pe@cms.edu", "target_role": "student", "dept_code": "PE", "course_name": "Production Engineering", "year": 4},
    {"name": "Amit Sharma", "email": "amit.sharma.it@cms.edu", "target_role": "student", "dept_code": "IT", "course_name": "Information Technology", "year": 2},

    # --- FACULTY APPLICANTS (12 Applicants) ---
    {"name": "Dr. Subhash Chandra Panda", "email": "prof.sc.panda@cms.edu", "target_role": "faculty", "dept_code": "CSE", "course_name": "Computer Science & Engineering", "designation": "Associate Professor"},
    {"name": "Prof. Rashmi Rekha Das", "email": "prof.rr.das@cms.edu", "target_role": "faculty", "dept_code": "EE", "course_name": "Electrical Engineering", "designation": "Assistant Professor"},
    {"name": "Dr. Jyoti Prakash Sahoo", "email": "prof.jp.sahoo@cms.edu", "target_role": "faculty", "dept_code": "IT", "course_name": "Information Technology", "designation": "Professor"},
    {"name": "Prof. Dibakar Mohapatra", "email": "prof.d.mohapatra@cms.edu", "target_role": "faculty", "dept_code": "ME", "course_name": "Mechanical Engineering", "designation": "Assistant Professor"},
    {"name": "Dr. Sanghamitra Jena", "email": "prof.s.jena@cms.edu", "target_role": "faculty", "dept_code": "CE", "course_name": "Civil Engineering", "designation": "Associate Professor"},
    {"name": "Prof. Tapan Kumar Behera", "email": "prof.tk.behera@cms.edu", "target_role": "faculty", "dept_code": "ETC", "course_name": "Electronics & Telecommunication", "designation": "Assistant Professor"},
    {"name": "Dr. Minati Kumari Swain", "email": "prof.mk.swain@cms.edu", "target_role": "faculty", "dept_code": "HUM", "course_name": "Humanities & Social Sciences", "designation": "Associate Professor"},
    {"name": "Prof. Ashok Kumar Tripathy", "email": "prof.ak.tripathy@cms.edu", "target_role": "faculty", "dept_code": "PE", "course_name": "Production Engineering", "designation": "Assistant Professor"},
    {"name": "Dr. Lopamudra Pattanaik", "email": "prof.l.pattanaik@cms.edu", "target_role": "faculty", "dept_code": "BS", "course_name": "Applied Mathematics", "designation": "Associate Professor"},
    {"name": "Prof. Chinmay Kumar Parida", "email": "prof.ck.parida@cms.edu", "target_role": "faculty", "dept_code": "BS", "course_name": "Applied Chemistry", "designation": "Assistant Professor"},
    {"name": "Dr. Biswajit Sahoo", "email": "prof.b.sahoo@cms.edu", "target_role": "faculty", "dept_code": "CSE", "course_name": "Computer Science & Engineering", "designation": "Professor"},
    {"name": "Prof. Smita Rani Satpathy", "email": "prof.sr.satpathy@cms.edu", "target_role": "faculty", "dept_code": "IT", "course_name": "Information Technology", "designation": "Assistant Professor"},

    # --- STAFF APPLICANTS (8 Applicants) ---
    {"name": "Suresh Chandra Rout", "email": "staff.sc.rout@cms.edu", "target_role": "staff", "dept_code": "CSE", "designation": "Senior Lab Instructor"},
    {"name": "Geetanjali Mishra", "email": "staff.g.mishra@cms.edu", "target_role": "staff", "dept_code": "EE", "designation": "Technical Assistant"},
    {"name": "Santosh Kumar Nayak", "email": "staff.sk.nayak@cms.edu", "target_role": "staff", "dept_code": "ME", "designation": "Workshop Superintendent"},
    {"name": "Padmini Sahoo", "email": "staff.p.sahoo@cms.edu", "target_role": "staff", "dept_code": "IT", "designation": "Network Administrator"},
    {"name": "Pradeep Kumar Das", "email": "staff.pk.das@cms.edu", "target_role": "staff", "dept_code": "CE", "designation": "Survey Lab Assistant"},
    {"name": "Lata Rani Mohanty", "email": "staff.lr.mohanty@cms.edu", "target_role": "staff", "dept_code": "HUM", "designation": "Administrative Office Clerk"},
    {"name": "Bhabani Prasad Jena", "email": "staff.bp.jena@cms.edu", "target_role": "staff", "dept_code": "PE", "designation": "Machine Shop Technician"},
    {"name": "Sunil Kumar Behera", "email": "staff.sk.behera@cms.edu", "target_role": "staff", "dept_code": "BS", "designation": "Physics Lab Assistant"},

    # --- PARENT APPLICANTS (5 Applicants) ---
    {"name": "Rajesh Sharma", "email": "parent.r.sharma@gmail.com", "target_role": "parent", "child_email": "aarav.sharma.cse@cms.edu", "relationship_type": "Father"},
    {"name": "Sunita Pattnaik Sr.", "email": "parent.s.pattnaik@gmail.com", "target_role": "parent", "child_email": "ananya.pattnaik.cse@cms.edu", "relationship_type": "Mother"},
    {"name": "Manoranjan Mohanty", "email": "parent.m.mohanty@gmail.com", "target_role": "parent", "child_email": "rohan.mohanty.ee@cms.edu", "relationship_type": "Father"},
    {"name": "Sasmita Das", "email": "parent.s.das@gmail.com", "target_role": "parent", "child_email": "priya.das.it@cms.edu", "relationship_type": "Mother"},
    {"name": "Kailash Chandra Swain", "email": "parent.kc.swain@gmail.com", "target_role": "parent", "child_email": "siddharth.swain.me@cms.edu", "relationship_type": "Father"}
]

REJECTION_REASONS = [
    "Verification document unreadable or mismatched with roll record.",
    "Target department quota limit reached for this academic session.",
    "Incomplete educational qualification certificates submitted.",
    "Unverifiable student roll number association.",
    "Duplicate registration request detected under existing email."
]

DEFAULT_PASSWORD = "UserPassword@123"

async def run_50_applications_simulation():
    engine = create_async_engine(settings.DATABASE_URL)
    hashed_pwd = hash_password(DEFAULT_PASSWORD)

    async with engine.begin() as conn:
        print("Connected to database. Initializing 50 User Onboarding Applications...\n")

        # 1. Fetch RBAC Role IDs
        roles = (await conn.execute(text("SELECT id, name FROM roles"))).fetchall()
        role_map = {r.name.lower(): r.id for r in roles}

        approved_count = 0
        rejected_count = 0

        # Decide rejection indices (12 out of 50 rejected, 38 approved)
        rejection_indices = {5, 10, 15, 20, 25, 30, 35, 40, 42, 45, 47, 49}

        for idx, app in enumerate(APPLICANTS_DATA, start=1):
            target_role = app["target_role"]
            role_id = role_map.get(target_role)

            # Resolve Dept ID & Course ID if applicable
            dept_id = None
            course_id = None

            if "dept_code" in app:
                dept_res = await conn.execute(
                    text("SELECT id FROM departments WHERE code = :code"),
                    {"code": app["dept_code"]}
                )
                dept_id = dept_res.scalar()

            if "course_name" in app:
                course_res = await conn.execute(
                    text("SELECT id FROM courses WHERE name = :name"),
                    {"name": app["course_name"]}
                )
                course_id = course_res.scalar()

            # Construct application_data payload
            app_data = {}
            if target_role == "student":
                app_data = {
                    "department_id": str(dept_id) if dept_id else None,
                    "course_id": str(course_id) if course_id else None,
                    "year": app.get("year", 1)
                }
            elif target_role == "faculty":
                app_data = {
                    "department_id": str(dept_id) if dept_id else None,
                    "course_id": str(course_id) if course_id else None,
                    "designation": app.get("designation", "Faculty")
                }
            elif target_role == "staff":
                app_data = {
                    "department_id": str(dept_id) if dept_id else None,
                    "designation": app.get("designation", "Staff")
                }
            elif target_role == "parent":
                app_data = {
                    "student_id_str": app.get("child_email"),
                    "relationship_type": app.get("relationship_type", "Parent")
                }

            # Decide Approval or Rejection
            is_approved = idx not in rejection_indices

            account_status = 'active' if is_approved else 'rejected'
            status_note = "Approved by Administrator after credential verification." if is_approved else random.choice(REJECTION_REASONS)

            # Check if User already exists
            user_res = await conn.execute(
                text("SELECT id FROM users WHERE email = :email"),
                {"email": app["email"]}
            )
            user_id = user_res.scalar()

            if not user_id:
                user_id = uuid.uuid4()
                await conn.execute(
                    text("""
                        INSERT INTO users (
                            id, email, hashed_password, account_status, status_note, user_type, name, 
                            target_role, application_data, email_notifications, in_app_alerts, role_id, created_at, updated_at
                        )
                        VALUES (
                            :id, :email, :password, :account_status, :status_note, :user_type, :name, 
                            :target_role, :application_data, TRUE, TRUE, :role_id, NOW(), NOW()
                        )
                    """),
                    {
                        "id": user_id,
                        "email": app["email"],
                        "password": hashed_pwd,
                        "account_status": account_status,
                        "status_note": status_note,
                        "user_type": target_role if is_approved else 'user',
                        "name": app["name"],
                        "target_role": target_role.capitalize(),
                        "application_data": json.dumps(app_data),
                        "role_id": role_id if is_approved else None
                    }
                )
            else:
                await conn.execute(
                    text("""
                        UPDATE users 
                        SET account_status = :account_status, status_note = :status_note, 
                            user_type = :user_type, role_id = :role_id, updated_at = NOW()
                        WHERE id = :id
                    """),
                    {
                        "id": user_id,
                        "account_status": account_status,
                        "status_note": status_note,
                        "user_type": target_role if is_approved else 'user',
                        "role_id": role_id if is_approved else None
                    }
                )

            # Create Profiles if Approved
            if is_approved:
                approved_count += 1

                if target_role == "student" and dept_id and course_id:
                    await conn.execute(
                        text("""
                            INSERT INTO student_profiles (id, user_id, course_id, department_id, year, academic_status, created_at, updated_at)
                            VALUES (gen_random_uuid(), :user_id, :course_id, :dept_id, :year, 'enrolled', NOW(), NOW())
                            ON CONFLICT (user_id) DO NOTHING;
                        """),
                        {"user_id": user_id, "course_id": course_id, "dept_id": dept_id, "year": app.get("year", 1)}
                    )

                elif target_role == "faculty" and dept_id and course_id:
                    await conn.execute(
                        text("""
                            INSERT INTO faculty_profiles (id, user_id, course_id, department_id, designation, employment_status, created_at, updated_at)
                            VALUES (gen_random_uuid(), :user_id, :course_id, :dept_id, :designation, 'active', NOW(), NOW())
                            ON CONFLICT (user_id) DO NOTHING;
                        """),
                        {"user_id": user_id, "course_id": course_id, "dept_id": dept_id, "designation": app.get("designation", "Faculty")}
                    )

                elif target_role == "staff":
                    await conn.execute(
                        text("""
                            INSERT INTO staff_profiles (id, user_id, department_id, designation, employment_status, created_at, updated_at)
                            VALUES (gen_random_uuid(), :user_id, :dept_id, :designation, 'active', NOW(), NOW())
                            ON CONFLICT (user_id) DO NOTHING;
                        """),
                        {"user_id": user_id, "dept_id": dept_id, "designation": app.get("designation", "Staff")}
                    )

                elif target_role == "parent":
                    # Find child student
                    child_res = await conn.execute(
                        text("SELECT id FROM users WHERE email = :child_email"),
                        {"child_email": app["child_email"]}
                    )
                    child_id = child_res.scalar()
                    if child_id:
                        await conn.execute(
                            text("""
                                INSERT INTO parent_profiles (id, user_id, student_id, relationship_type, created_at, updated_at)
                                VALUES (gen_random_uuid(), :user_id, :student_id, :relationship, NOW(), NOW())
                                ON CONFLICT (user_id) DO NOTHING;
                            """),
                            {"user_id": user_id, "student_id": child_id, "relationship": app.get("relationship_type", "Parent")}
                        )

                print(f"[{idx:02d}/50] ✅ APPROVED ({target_role.upper()}): {app['name']} <{app['email']}>")

            else:
                rejected_count += 1
                print(f"[{idx:02d}/50] ❌ REJECTED ({target_role.upper()}): {app['name']} <{app['email']}> | Reason: {status_note}")

        print("\n==========================================================")
        print("✅ COMPLETED 50 USER APPLICATIONS ONBOARDING SIMULATION")
        print(f"   Total Processed: 50")
        print(f"   Approved Accounts: {approved_count} (Active)")
        print(f"   Rejected Accounts: {rejected_count} (Rejected)")
        print("==========================================================")

if __name__ == "__main__":
    asyncio.run(run_50_applications_simulation())
