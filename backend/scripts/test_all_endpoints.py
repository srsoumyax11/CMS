import requests
import uuid
import sys
import os
import random
import string

# Create a randomized email to ensure the test can be run multiple times
random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
STUDENT_EMAIL = f"teststudent_{random_suffix}@example.com"
FACULTY_EMAIL = f"testfaculty_{random_suffix}@example.com"
STUDENT_PASSWORD = "securepassword123"
FACULTY_PASSWORD = "facultypassword123"
SUPERADMIN_EMAIL = "admin@example.com"
SUPERADMIN_PASSWORD = "supersecret123"

BASE_URL = "http://127.0.0.1:8000/api"

# Helper for pretty printing
def print_step(msg):
    print(f"\n[{'='*10} {msg} {'='*10}]")

def run_tests():
    # ---------------------------------------------------------
    # 0. We need a valid course_id and branch_id to register.
    # We will fetch this directly from the DB for the test script.
    # ---------------------------------------------------------
    print_step("0. Fetching DB Reference Data (Courses/Branches)")
    try:
        import asyncio
        from sqlalchemy.ext.asyncio import create_async_engine
        from sqlalchemy import text
        
        async def fetch_ids():
            engine = create_async_engine("postgresql+asyncpg://postgres:postgres@localhost:54322/postgres")
            async with engine.connect() as conn:
                res = await conn.execute(text("SELECT id FROM courses LIMIT 1"))
                c_id = res.scalar()
                if not c_id:
                    print("No courses found. Did you run scripts/setup.py?")
                    sys.exit(1)
                
                res = await conn.execute(text("SELECT id FROM branches LIMIT 1"))
                b_id = res.scalar()
                return str(c_id), str(b_id)
                
        course_id, branch_id = asyncio.run(fetch_ids())
        print(f"Found Course: {course_id} | Branch: {branch_id}")
    except Exception as e:
        print(f"Failed to connect to database for setup data: {e}")
        sys.exit(1)

    # ---------------------------------------------------------
    # 1. REGISTER STUDENT
    # ---------------------------------------------------------
    print_step("1. POST /api/auth/register (Student)")
    
    # Negative Test: Invalid data (missing course_id)
    bad_reg_data = {
        "email": STUDENT_EMAIL,
        "password": STUDENT_PASSWORD,
        "name": "Test Student",
        # missing course_id
        "branch_id": branch_id,
        "year": 2024
    }
    r = requests.post(f"{BASE_URL}/auth/register", json=bad_reg_data)
    assert r.status_code == 422, f"Expected 422 for missing course_id, got {r.status_code}"
    print("✅ Negative test passed: Missing course_id caught (422)")
    
    # Negative Test: Invalid email format
    bad_email_data = bad_reg_data.copy()
    bad_email_data["course_id"] = course_id
    bad_email_data["email"] = "not-an-email"
    r = requests.post(f"{BASE_URL}/auth/register", json=bad_email_data)
    assert r.status_code == 422, "Expected 422 for bad email"
    print("✅ Negative test passed: Invalid email caught (422)")

    # Positive Test: Register successful
    reg_data = {
        "email": STUDENT_EMAIL,
        "password": STUDENT_PASSWORD,
        "name": "Test Student",
        "course_id": course_id,
        "branch_id": branch_id,
        "year": 2024
    }
    r = requests.post(f"{BASE_URL}/auth/register", json=reg_data)
    assert r.status_code == 200
    res_json = r.json()
    assert res_json["success"] is True
    assert res_json["data"]["status"] == "pending"
    student_id = res_json["data"]["user_id"]
    print(f"✅ Student registered successfully! user_id: {student_id}")

    # ---------------------------------------------------------
    # 2. LOGIN STUDENT
    # ---------------------------------------------------------
    print_step("2. POST /api/auth/login (Student)")
    
    # Negative Test: Bad password
    r = requests.post(f"{BASE_URL}/auth/login", json={"email": STUDENT_EMAIL, "password": "wrongpassword"})
    assert r.json()["success"] is False
    print("✅ Negative test passed: Wrong password rejected")

    # Positive Test: Login successful
    r = requests.post(f"{BASE_URL}/auth/login", json={"email": STUDENT_EMAIL, "password": STUDENT_PASSWORD})
    assert r.status_code == 200
    res_json = r.json()
    assert res_json["success"] is True
    assert res_json["data"]["status"] == "pending", "Status should be pending on login"
    student_token = res_json["data"]["access_token"]
    student_headers = {"Authorization": f"Bearer {student_token}"}
    print("✅ Student logged in successfully despite being pending.")

    # ---------------------------------------------------------
    # 3. GET /api/auth/me AS PENDING STUDENT
    # ---------------------------------------------------------
    print_step("3. GET /api/auth/me (Pending Student)")
    r = requests.get(f"{BASE_URL}/auth/me", headers=student_headers)
    assert r.status_code == 200
    res_json = r.json()
    assert res_json["success"] is True
    print("✅ /auth/me accessed successfully. No 403 Forbidden! The pre-approval trap is fixed.")

    # ---------------------------------------------------------
    # 4. LOGIN SUPERADMIN
    # ---------------------------------------------------------
    print_step("4. POST /api/auth/login (SuperAdmin)")
    r = requests.post(f"{BASE_URL}/auth/login", json={"email": SUPERADMIN_EMAIL, "password": SUPERADMIN_PASSWORD})
    assert r.status_code == 200
    admin_token = r.json()["data"]["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print("✅ SuperAdmin logged in successfully.")

    # ---------------------------------------------------------
    # 5. GET /api/admin/students?status=pending (SuperAdmin)
    # ---------------------------------------------------------
    print_step("5. GET /api/admin/students?status=pending (SuperAdmin)")
    r = requests.get(f"{BASE_URL}/admin/students?status=pending", headers=admin_headers)
    assert r.status_code == 200
    students = r.json()["data"]
    # Find our specific student
    student_profile = next((s for s in students if s["user_id"] == student_id), None)
    assert student_profile is not None, "Newly registered student not found in pending list"
    profile_id = student_profile["id"]
    print(f"✅ Found student in pending list. Profile ID: {profile_id}")

    # ---------------------------------------------------------
    # 6. PATCH /api/admin/students/{id}/status
    # ---------------------------------------------------------
    print_step("6. PATCH /api/admin/students/{id}/status")
    
    # Negative Test: Try passing "active" to check Pydantic 422 rejection
    r = requests.patch(f"{BASE_URL}/admin/students/{profile_id}/status", 
                       headers=admin_headers, 
                       json={"status": "active"})
    assert r.status_code == 422, f"Expected 422, got {r.status_code}"
    print("✅ Negative test passed: Invalid enum status 'active' cleanly rejected with 422.")
    
    # Positive Test: Approve the student
    r = requests.patch(f"{BASE_URL}/admin/students/{profile_id}/status", 
                       headers=admin_headers, 
                       json={"status": "approved"})
    assert r.status_code == 200
    assert r.json()["data"]["status"] == "approved"
    print("✅ Student approved successfully!")

    # ---------------------------------------------------------
    # 7. GET /api/auth/me AGAIN (Same token)
    # ---------------------------------------------------------
    print_step("7. GET /api/auth/me (As newly approved student)")
    # Re-login to get the latest token with updated roles injected into JWT if we were doing JWT roles,
    # but since our backend looks up roles dynamically on every hit, the SAME token works to access role-protected endpoints!
    # Wait, /api/auth/me doesn't expose role, it just exposes base user. 
    r = requests.get(f"{BASE_URL}/auth/me", headers=student_headers)
    assert r.status_code == 200
    print("✅ Same token works for /auth/me.")

    # ---------------------------------------------------------
    # 8. GET /api/roles/permission-matrix
    # ---------------------------------------------------------
    print_step("8. GET /api/roles/permission-matrix (For Student Role)")
    # First, get the student role id
    r = requests.get(f"{BASE_URL}/roles", headers=admin_headers)
    roles = r.json()["data"]
    student_role = next(r for r in roles if r["name"] == "Student")
    student_role_id = student_role["id"]
    
    r = requests.get(f"{BASE_URL}/roles/permission-matrix?role_id={student_role_id}", headers=admin_headers)
    assert r.status_code == 200
    matrix = r.json()["data"]
    
    # Check that Student only has access to view/edit their own profile
    # E.g. asset: student_profile -> view (granted: True)
    has_view = False
    for asset in matrix["assets"]:
        if asset["name"] == "student_profile":
            for action in asset["actions"]:
                if action["code"] == "view" and action["granted"] is True:
                    has_view = True
                if action["code"] == "delete":
                    assert action["granted"] is False, "Student should not have delete access!"
    assert has_view is True, "Student role should have view access to student_profile"
    print("✅ Permission matrix successfully loaded and verified for Student role.")

    # ---------------------------------------------------------
    # 9. POST /api/admin/faculty
    # ---------------------------------------------------------
    print_step("9. POST /api/admin/faculty (SuperAdmin)")
    
    # Negative Test: missing designation
    bad_fac_data = {
        "email": FACULTY_EMAIL,
        "password": FACULTY_PASSWORD,
        "name": "Prof. Test",
        "department": "CSE",
        # missing designation
    }
    r = requests.post(f"{BASE_URL}/admin/faculty", headers=admin_headers, json=bad_fac_data)
    assert r.status_code == 422
    print("✅ Negative test passed: Missing faculty designation caught (422)")

    # Positive Test
    fac_data = bad_fac_data.copy()
    fac_data["designation"] = "Assistant Professor"
    r = requests.post(f"{BASE_URL}/admin/faculty", headers=admin_headers, json=fac_data)
    assert r.status_code == 200
    print("✅ Faculty created successfully! It is active immediately.")

    # ---------------------------------------------------------
    # 10. NEGATIVE TEST: Student hitting Admin endpoint
    # ---------------------------------------------------------
    print_step("10. NEGATIVE RBAC TEST: Student accessing Admin endpoint")
    r = requests.get(f"{BASE_URL}/admin/students", headers=student_headers)
    print("Status:", r.status_code, "Body:", r.text)
    # The global StarletteHTTPException handler should intercept this 403 and format it cleanly
    assert r.status_code == 403
    res_json = r.json()
    assert res_json["success"] is False
    assert res_json["error"] == "Not authenticated / Unauthorized"
    print("✅ Clean 403 Forbidden returned in proper APIResponse shape! No stack trace.")

    print_step("🎉 ALL TESTS PASSED SUCCESSFULLY 🎉")

if __name__ == "__main__":
    run_tests()
