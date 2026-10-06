import requests
from .config import (
    BASE_URL, STUDENT_EMAIL, STUDENT_PASSWORD, random_suffix, 
    SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD, print_step
)
from .state import state

def run_auth_tests():
    course_id = state["course_id"]
    # ---------------------------------------------------------
    # 1. REGISTER STUDENT
    # ---------------------------------------------------------
    print_step("1. POST /api/auth/register (Student)")
    
    # Negative Test: Invalid data (missing course_id)
    bad_reg_data = {
        "email": STUDENT_EMAIL,
        "password": STUDENT_PASSWORD,
        "name": "Test Student",
        "admission_year": 2024,
        "year": 1,
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
    weak_pwd_data["department_id"] = state["department_id"]
    weak_pwd_data["user_id"] = "STU9999"
    weak_pwd_data["password"] = "weak"
    r = requests.post(f"{BASE_URL}/auth/register", json=weak_pwd_data)
    assert r.status_code == 400, f"Expected 400 for weak password, got {r.status_code}: {r.text}"
    print("✅ Negative test passed: Weak password caught (400)")

    import random
    reg_no_dynamic = f"2301{random.randint(100000, 999999)}"
    reg_data = {
        "email": STUDENT_EMAIL,
        "password": STUDENT_PASSWORD,
        "name": "Test Student",
        "registration_no": reg_no_dynamic,
        "roll_no": f"23/CSE/{random.randint(100, 999)}",
        "course_id": course_id,
        "department_id": state["department_id"],
        "admission_year": 2023,
        "current_semester": 1,
        "section": "A",
        "year": 1
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
