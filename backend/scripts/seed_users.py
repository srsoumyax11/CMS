import os
import sys
import random

# Ensure backend directory is in sys.path so we can import from scripts
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from scripts.api_client import client
from dotenv import load_dotenv

def create_users():
    # Authenticate
    load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
    email = os.getenv("SUPERADMIN_EMAIL", "superadmin@cms.com")
    password = os.getenv("SUPERADMIN_PASSWORD", "Super+Admin@123")
    
    if not client.login(email, password):
        print("Failed to authenticate.")
        sys.exit(1)

    # Fetch courses
    courses_resp = client.get("/admin/courses").json()
    if not courses_resp.get("success"):
        print("Failed to fetch courses.")
        sys.exit(1)
    courses = courses_resp.get("data", [])
    if not courses:
        print("No courses available.")
        sys.exit(1)
    btech_course = next((c for c in courses if c['name'] == 'B.Tech'), courses[0])

    # Fetch departments
    depts_resp = client.get("/admin/departments").json()
    if not depts_resp.get("success"):
        print("Failed to fetch departments.")
        sys.exit(1)
    departments = depts_resp.get("data", [])
    academic_depts = [d for d in departments if d['department_type'] == 'academic']
    admin_depts = [d for d in departments if d['department_type'] == 'administrative']

    if not academic_depts or not admin_depts:
        print("Need both academic and administrative departments.")
        sys.exit(1)

    # Fetch roles
    roles_resp = client.get("/roles").json()
    if not roles_resp.get("success"):
        print("Failed to fetch roles.")
        sys.exit(1)
    roles = roles_resp.get("data", [])
    admin_role = next((r for r in roles if r['name'] == 'Admin'), None)

    if not admin_role:
        print("Admin role not found.")
        sys.exit(1)

    print("\n--- Creating 10 Faculty Users ---")
    faculty_data = [
        {"name": "Dr. Rajesh Kumar", "email": "r.kumar@cms.edu", "designation": "Professor"},
        {"name": "Prof. Sarah Jenkins", "email": "s.jenkins@cms.edu", "designation": "Associate Professor"},
        {"name": "Dr. Amit Patel", "email": "a.patel@cms.edu", "designation": "Assistant Professor"},
        {"name": "Dr. Emily Chen", "email": "e.chen@cms.edu", "designation": "Assistant Professor"},
        {"name": "Prof. Michael Chang", "email": "m.chang@cms.edu", "designation": "Professor"},
        {"name": "Dr. Neha Sharma", "email": "n.sharma@cms.edu", "designation": "Associate Professor"},
        {"name": "Dr. Robert Williams", "email": "r.williams@cms.edu", "designation": "Assistant Professor"},
        {"name": "Prof. Anjali Desai", "email": "a.desai@cms.edu", "designation": "Professor"},
        {"name": "Dr. David Miller", "email": "d.miller@cms.edu", "designation": "Associate Professor"},
        {"name": "Dr. Priya Singh", "email": "p.singh@cms.edu", "designation": "Assistant Professor"}
    ]

    for fac in faculty_data:
        dept = random.choice(academic_depts)
        payload = {
            "name": fac["name"],
            "email": fac["email"],
            "password": "Password@123",
            "course_id": btech_course['id'],
            "department_id": dept['id'],
            "designation": fac["designation"]
        }
        resp = client.post("/admin/faculty", json=payload)
        if resp.status_code == 200:
            print(f"Created Faculty: {payload['name']} in {dept['name']}")
        else:
            print(f"Failed to create Faculty {payload['name']}: {resp.text}")

    print("\n--- Creating 2 Admin Users ---")
    admin_data = [
        {"name": "Mr. Vikram Malhotra", "email": "v.malhotra@cms.edu", "designation": "Registrar"},
        {"name": "Mrs. Susan Wright", "email": "s.wright@cms.edu", "designation": "Chief Accounts Officer"}
    ]

    for adm in admin_data:
        dept = random.choice(admin_depts)
        payload = {
            "name": adm["name"],
            "email": adm["email"],
            "password": "Password@123",
            "course_id": btech_course['id'],  # Required by payload schema
            "department_id": dept['id'],
            "designation": adm["designation"],
            "role_id": admin_role['id']
        }
        resp = client.post("/admin/faculty", json=payload)
        if resp.status_code == 200:
            print(f"Created Admin: {payload['name']} in {dept['name']}")
        else:
            print(f"Failed to create Admin {payload['name']}: {resp.text}")

if __name__ == "__main__":
    create_users()
