import requests
from .config import BASE_URL, print_step, FACULTY_EMAIL, FACULTY_PASSWORD, STUDENT_EMAIL, random_suffix
from .state import state

def run_rbac_tests():
    student_id = f"STU{random_suffix.upper()}"
    student_headers = state["student_headers"]
    admin_headers = state["admin_headers"]
    course_id = state["course_id"]
    # ---------------------------------------------------------
    # 5. GET /api/admin/students?status=pending (SuperAdmin)
    # ---------------------------------------------------------
    print_step("5. GET /api/admin/students?status=pending (SuperAdmin)")
    r = requests.get(f"{BASE_URL}/admin/students?status=pending", headers=admin_headers)
    assert r.status_code == 200
    students = r.json()["data"]
    # Find our specific student
    student_profile = next((s for s in students if s["email"] == STUDENT_EMAIL), None)
    assert student_profile is not None, "Newly registered student not found in pending list"
    profile_id = student_profile["id"]
    print(f"✅ Found student in pending list. Profile ID: {profile_id}")

    # ---------------------------------------------------------
    # 6. PATCH /api/admin/students/{id}/status
    # ---------------------------------------------------------
    print_step("6. PATCH /api/admin/students/{id}/status")
    
    # Negative Test: Try passing an invalid enum to check Pydantic 422 rejection
    r = requests.patch(f"{BASE_URL}/admin/students/{profile_id}/status", 
                       headers=admin_headers, 
                       json={"account_status": "invalid_status"})
    assert r.status_code == 422, f"Expected 422, got {r.status_code}"
    print("✅ Negative test passed: Invalid enum status cleanly rejected with 422.")
    
    # Positive Test: Approve the student (active)
    r = requests.patch(f"{BASE_URL}/admin/students/{profile_id}/status", 
                       headers=admin_headers, 
                       json={"account_status": "active", "status_note": "Welcome!"})
    assert r.status_code == 200
    assert r.json()["data"]["account_status"] == "active"
    if state.get("room_id"):
        r_patch = requests.patch(f"{BASE_URL}/admin/students/{profile_id}", headers=admin_headers, json={"room_id": state["room_id"]})
        assert r_patch.status_code == 200, f"Failed to patch student room_id: {r_patch.text}"
    print("✅ Student approved successfully!")

    # ---------------------------------------------------------
    # 7. GET /api/auth/me AGAIN (Same token)
    # ---------------------------------------------------------
    print_step("7. GET /api/auth/me (As newly approved student)")
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
        "name": "Prof. Soumya Ranjan Sahoo",
        "department_id": state["department_id"],
        "course_id": state["course_id"],
        # missing designation
    }
    r = requests.post(f"{BASE_URL}/admin/faculty", headers=admin_headers, json=bad_fac_data)
    assert r.status_code == 422
    print("✅ Negative test passed: Missing faculty designation caught (422)")

    # Positive Test
    fac_data = bad_fac_data.copy()
    fac_data["designation"] = "Assistant Professor"
    r = requests.post(f"{BASE_URL}/admin/faculty", headers=admin_headers, json=fac_data)
    if r.status_code != 200:
        print(f"FAILED TO CREATE FACULTY: {r.text}")
    assert r.status_code == 200
    res_json = r.json()
    fac_id = res_json["data"]["id"]
    state["faculty_uuid"] = fac_id
    print("✅ Faculty created successfully! It is active immediately.")

    # ---------------------------------------------------------
    # 10. NEGATIVE TEST: Student hitting Admin endpoint
    # ---------------------------------------------------------
    print_step("10. NEGATIVE RBAC TEST: Student accessing Admin endpoint")
    r = requests.get(f"{BASE_URL}/admin/students", headers=student_headers)
    assert r.status_code == 403
    res_json = r.json()
    assert res_json["success"] is False
    assert res_json["error"] == "Not authenticated / Unauthorized"
    print("✅ Clean 403 Forbidden returned in proper APIResponse shape! No stack trace.")

    # ---------------------------------------------------------
    # 11. Create Second Student for Privacy Testing
    # ---------------------------------------------------------
    print_step("11. Create Second Student for Privacy Testing")
    student2_email = f"test_student2_{random_suffix}@example.com"
    student2_password = "Securepassword123!"
    import random
    reg_no_dynamic2 = f"2302{random.randint(100000, 999999)}"
    register_s2_data = {
        "email": student2_email,
        "password": student2_password,
        "name": "Test Student 2",
        "registration_no": reg_no_dynamic2,
        "roll_no": f"23/CSE/{random.randint(100, 999)}",
        "course_id": course_id,
        "department_id": state["department_id"],
        "admission_year": 2024,
        "current_semester": 1,
        "section": "A",
        "year": 1
    }
    r = requests.post(f"{BASE_URL}/auth/register", json=register_s2_data)
    if r.status_code != 200:
        print("S2 Register Error:", r.status_code, r.text)
    assert r.status_code == 200, f"S2 Register failed: {r.status_code} {r.text}"
    s2_str_id = f"STU2{random_suffix.upper()}"
    
    # Login S2
    r = requests.post(f"{BASE_URL}/auth/login", json={"email": student2_email, "password": student2_password})
    assert r.status_code == 200
    s2_token = r.json()["data"]["access_token"]
    s2_headers = {"Authorization": f"Bearer {s2_token}"}
    
    # Create Profile for S2 is obsolete in new refactored code (created during register)
    
    # Fetch from Admin Pending list
    r = requests.get(f"{BASE_URL}/admin/students?status=pending", headers=admin_headers)
    students = r.json()["data"]
    s2_profile = next((s for s in students if s["email"] == student2_email), None)
    assert s2_profile is not None
    
    # Approve S2
    r = requests.patch(f"{BASE_URL}/admin/students/{s2_profile['id']}/status", 
                       headers=admin_headers, 
                       json={"account_status": "active", "status_note": "Welcome 2!"})
    assert r.status_code == 200
    print("✅ Student 2 approved successfully!")
    
    r = requests.get(f"{BASE_URL}/auth/me", headers=s2_headers)
    assert r.status_code == 200
    s2_uuid = r.json()["data"]["id"]
    
    # Login as Faculty
    fac_login = requests.post(f"{BASE_URL}/auth/login", json={
        "email": FACULTY_EMAIL,
        "password": FACULTY_PASSWORD
    })
    assert fac_login.status_code == 200, f"Faculty login failed: {fac_login.text}"
    faculty_token = fac_login.json()["data"]["access_token"]
    faculty_headers = {"Authorization": f"Bearer {faculty_token}"}
    
    state["s2_token"] = s2_token
    state["s2_headers"] = s2_headers
    state["student2_uuid"] = s2_uuid
    state["faculty_token"] = faculty_token
    state["faculty_headers"] = faculty_headers
