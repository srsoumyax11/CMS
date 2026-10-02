import requests
from .config import (
    BASE_URL, STUDENT_EMAIL, STUDENT_PASSWORD, random_suffix, 
    SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD, print_step
)
from .state import state

def run_auth_tests():
    course_id = state["course_id"]
    branch_id = state["branch_id"]

    # ---------------------------------------------------------
    # 1. REGISTER STUDENT
    # ---------------------------------------------------------
    print_step("1. POST /api/auth/register (Student)")
    
    # Negative Test: Invalid data (missing course_id)
    bad_reg_data = {
        "email": STUDENT_EMAIL,
        "password": STUDENT_PASSWORD,
        "name": "Test Student",
        "branch_id": branch_id,
        "year": 2024,
        "hostel": "Hostel B"
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

    # Negative Test: Weak password
    weak_pwd_data = bad_reg_data.copy()
    weak_pwd_data["course_id"] = course_id
    weak_pwd_data["password"] = "weak"
    r = requests.post(f"{BASE_URL}/auth/register", json=weak_pwd_data)
    assert r.status_code == 400, "Expected 400 for weak password"
    print("✅ Negative test passed: Weak password caught (400)")

    # Positive Test: Register successful
    reg_data = {
        "email": STUDENT_EMAIL,
        "password": STUDENT_PASSWORD,
        "name": "Test Student",
        "user_id": f"STU{random_suffix.upper()}",
        "course_id": course_id,
        "branch_id": branch_id,
        "year": 2024,
        "hostel": "Hostel A"
    }
    r = requests.post(f"{BASE_URL}/auth/register", json=reg_data)
    if r.status_code != 200:
        print("Error response:", r.text)
    assert r.status_code == 200
    res_json = r.json()
    assert res_json["success"] is True
    student_id = f"STU{random_suffix.upper()}"
    print(f"✅ Student registered successfully! user_id: {student_id}")

    # ---------------------------------------------------------
    # 2. LOGIN STUDENT
    # ---------------------------------------------------------
    print_step("2. POST /api/auth/login (Student)")
    
    # Negative Test: Bad password
    r = requests.post(f"{BASE_URL}/auth/login", json={"email": STUDENT_EMAIL, "password": "wrongpassword"})
    assert r.status_code == 401, f"Expected 401 Unauthorized, got {r.status_code}"
    assert r.json()["success"] is False
    print("✅ Negative test passed: Wrong password rejected")

    # Positive Test: Login successful
    r = requests.post(f"{BASE_URL}/auth/login", json={"email": STUDENT_EMAIL, "password": STUDENT_PASSWORD})
    assert r.status_code == 200
    res_json = r.json()
    assert res_json["success"] is True
    assert res_json["data"]["account_status"] == "pending", "Status should be pending on login"
    student_token = res_json["data"]["access_token"]
    student_headers = {"Authorization": f"Bearer {student_token}"}
    print("✅ Student logged in successfully despite being pending.")
    
    r = requests.post(f"{BASE_URL}/users/me/student-profile", headers=student_headers, json={
        "course_id": course_id, "branch_id": branch_id, "year": 2024, "hostel": "Hostel A"
    })
    assert r.status_code == 200, f"Profile creation failed: {r.text}"
    print("✅ Student profile created successfully.")
    
    state["student_token"] = student_token
    state["student_headers"] = student_headers

    # ---------------------------------------------------------
    # 3. GET /api/auth/me AS PENDING STUDENT
    # ---------------------------------------------------------
    print_step("3. GET /api/auth/me (Pending Student)")
    r = requests.get(f"{BASE_URL}/auth/me", headers=student_headers)
    assert r.status_code == 200
    res_json = r.json()
    assert res_json["success"] is True
    student_uuid = res_json["data"]["id"]
    state["student_uuid"] = student_uuid
    print("✅ /auth/me accessed successfully. No 403 Forbidden! The pre-approval trap is fixed.")

    # ---------------------------------------------------------
    # 4. LOGIN SUPERADMIN
    # ---------------------------------------------------------
    print_step("4. POST /api/auth/login (SuperAdmin)")
    r = requests.post(f"{BASE_URL}/auth/login", json={"email": SUPERADMIN_EMAIL, "password": SUPERADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    admin_token = r.json()["data"]["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    state["admin_token"] = admin_token
    state["admin_headers"] = admin_headers
    print("✅ SuperAdmin logged in successfully.")
