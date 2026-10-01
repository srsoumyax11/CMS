import os
import sys
import random
from faker import Faker

# Ensure backend directory is in sys.path so we can import from scripts
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from scripts.api_client import APIClient, client as admin_client
from dotenv import load_dotenv

fake = Faker()

def create_students(count=30):
    # Authenticate admin
    load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
    email = os.getenv("SUPERADMIN_EMAIL", "superadmin@cms.com")
    password = os.getenv("SUPERADMIN_PASSWORD", "Super+Admin@123")
    
    if not admin_client.login(email, password):
        print("Failed to authenticate admin.")
        sys.exit(1)

    # Fetch courses
    courses_resp = admin_client.get("/admin/courses").json()
    if not courses_resp.get("success"):
        print("Failed to fetch courses.")
        sys.exit(1)
    courses = [c for c in courses_resp.get("data", []) if c['is_active']]

    # Fetch departments
    depts_resp = admin_client.get("/admin/departments").json()
    if not depts_resp.get("success"):
        print("Failed to fetch departments.")
        sys.exit(1)
    academic_depts = [d for d in depts_resp.get("data", []) if d['department_type'] == 'academic' and d['is_active']]

    if not courses or not academic_depts:
        print("Need active courses and academic departments.")
        sys.exit(1)

    print(f"\n--- Creating {count} Fake Students ---")
    
    created_emails = []

    for _ in range(count):
        student_client = APIClient()
        
        first_name = fake.first_name()
        last_name = fake.last_name()
        name = f"{first_name} {last_name}"
        email = f"{first_name.lower()}.{last_name.lower()}{random.randint(10, 999)}@student.cms.edu"
        user_id = f"STU{random.randint(100000, 999999)}"
        
        # 1. Register student
        reg_payload = {
            "name": name,
            "email": email,
            "password": "Password@123",
            "user_id": user_id
        }
        
        reg_resp = student_client.post("/auth/register", json=reg_payload)
        if reg_resp.status_code != 200:
            print(f"Failed to register {email}: {reg_resp.text}")
            continue
            
        data = reg_resp.json().get("data", {})
        access_token = data.get("access_token")
        
        if not access_token:
            print(f"Failed to get token for {email}")
            continue
            
        student_client.token = access_token
        student_client.session.headers.update({"Authorization": f"Bearer {access_token}"})
        
        # 2. Create student profile
        course = random.choice(courses)
        dept = random.choice(academic_depts)
        year = random.randint(2020, 2026)
        
        prof_payload = {
            "course_id": course['id'],
            "department_id": dept['id'],
            "year": year,
            "hostel": random.choice(["Block A", "Block B", "Block C", None])
        }
        
        prof_resp = student_client.post("/users/me/student-profile", json=prof_payload)
        if prof_resp.status_code == 200:
            print(f"Registered and created profile for {name} ({user_id})")
            created_emails.append(email)
        else:
            print(f"Failed to create profile for {email}: {prof_resp.text}")

    print("\n--- Approving Students ---")
    
    # 3. Approve them
    students_resp = admin_client.get("/admin/students?limit=1000").json()
    if not students_resp.get("success"):
        print("Failed to fetch students to approve.")
        return
        
    all_students = students_resp.get("data", [])
    
    for student in all_students:
        if student['email'] in created_emails and student['account_status'] != 'active':
            status_payload = {
                "account_status": "active"
            }
            patch_resp = admin_client.patch(f"/admin/students/{student['id']}/status", json=status_payload)
            if patch_resp.status_code == 200:
                print(f"Approved {student['email']}")
            else:
                print(f"Failed to approve {student['email']}: {patch_resp.text}")

    print("\nStudent seeding complete.")

if __name__ == "__main__":
    count_str = input("How many students to generate? (default: 30): ").strip()
    try:
        count = int(count_str) if count_str else 30
    except ValueError:
        count = 30
    create_students(count)
