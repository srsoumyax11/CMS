import random
import requests
from .config import BASE_URL, print_step
from .state import state

def run_staff_faculty_tests():
    student_headers = state.get("student_headers")
    admin_headers = state.get("admin_headers")
    dept_id = state.get("dept_id") or state.get("department_id")
    faculty_uuid = state.get("faculty_uuid")

    if not admin_headers or not student_headers:
        print("Skipping staff/faculty tests: auth headers not initialized in state")
        return

    rand_suffix = random.randint(1000, 9999)

    # ==========================================
    # ITEM 3: STAFF ROLE & LIFECYCLE TESTS
    # ==========================================
    print_step("46. POST /api/admin/staff (RBAC & Creation)")
    staff_payload = {
        "name": "Ramesh Chandra Jena",
        "email": f"staff_{rand_suffix}@example.com",
        "password": "Password@123",
        "department_id": dept_id,
        "designation": "Hostel Warden"
    }

    # Student cannot create staff
    res_unauth = requests.post(f"{BASE_URL}/admin/staff", headers=student_headers, json=staff_payload)
    assert res_unauth.status_code == 403, f"Expected 403 for student creating staff, got {res_unauth.status_code}"
    print("✅ RBAC passed: Student blocked from creating staff (403).")

    # Admin creates staff
    res_staff = requests.post(f"{BASE_URL}/admin/staff", headers=admin_headers, json=staff_payload)
    assert res_staff.status_code in [200, 201], f"Failed to create staff: {res_staff.text}"
    staff_data = res_staff.json()["data"]
    staff_id = staff_data["id"]
    assert staff_data["designation"] == "Hostel Warden"
    assert staff_data["account_status"] == "active"
    print(f"✅ Admin created staff member successfully: {staff_id} ({staff_data['name']})")

    print_step("47. GET /api/admin/staff (List & Filters)")
    # Student cannot list staff
    res_list_unauth = requests.get(f"{BASE_URL}/admin/staff", headers=student_headers)
    assert res_list_unauth.status_code == 403
    print("✅ RBAC passed: Student blocked from listing staff (403).")

    # Admin lists staff
    res_list = requests.get(f"{BASE_URL}/admin/staff", headers=admin_headers)
    assert res_list.status_code == 200
    all_staff = res_list.json()["data"]
    assert any(s["id"] == staff_id for s in all_staff), "Created staff not found in list"
    print(f"✅ Admin listed staff members successfully ({len(all_staff)} found).")

    # Filter by department
    if dept_id:
        res_dept_filter = requests.get(f"{BASE_URL}/admin/staff?department_id={dept_id}", headers=admin_headers)
        assert res_dept_filter.status_code == 200
        dept_staff = res_dept_filter.json()["data"]
        assert all(s["department_id"] == dept_id for s in dept_staff if s["department_id"])
        print(f"✅ Filter by department works ({len(dept_staff)} matching).")

    print_step("48. GET /api/admin/staff/{id} (Single Record)")
    res_get = requests.get(f"{BASE_URL}/admin/staff/{staff_id}", headers=admin_headers)
    assert res_get.status_code == 200
    single_staff = res_get.json()["data"]
    assert single_staff["id"] == staff_id
    assert single_staff["designation"] == "Hostel Warden"
    print(f"✅ Fetched single staff record successfully.")

    print_step("49. PATCH /api/admin/staff/{id} (Update Details)")
    update_payload = {
        "designation": "Senior Hostel Warden",
        "name": "Dr. Ramesh Chandra Jena"
    }
    res_update = requests.patch(f"{BASE_URL}/admin/staff/{staff_id}", headers=admin_headers, json=update_payload)
    assert res_update.status_code == 200, f"Failed to update staff: {res_update.text}"
    updated_staff = res_update.json()["data"]
    assert updated_staff["designation"] == "Senior Hostel Warden"
    assert updated_staff["name"] == "Dr. Ramesh Chandra Jena"
    print("✅ Staff details updated successfully.")

    print_step("50. PATCH /api/admin/staff/{id}/status (Lifecycle Status)")
    status_payload = {
        "account_status": "suspended",
        "employment_status": "on_leave",
        "status_note": "On medical leave for two weeks"
    }
    res_status = requests.patch(f"{BASE_URL}/admin/staff/{staff_id}/status", headers=admin_headers, json=status_payload)
    assert res_status.status_code == 200, f"Failed to update staff status: {res_status.text}"

    # Verify status persisted
    res_verify = requests.get(f"{BASE_URL}/admin/staff/{staff_id}", headers=admin_headers)
    assert res_verify.status_code == 200
    verified_data = res_verify.json()["data"]
    assert verified_data["account_status"] == "suspended"
    assert verified_data["employment_status"] == "on_leave"
    assert verified_data["status_note"] == "On medical leave for two weeks"
    print("✅ Staff lifecycle status updated and verified.")


    # ==========================================
    # ITEM 4: FACULTY MANAGEMENT PARITY TESTS
    # ==========================================
    if faculty_uuid:
        print_step("51. GET /api/admin/faculty/{id} (Single Record Parity)")
        res_fac_get = requests.get(f"{BASE_URL}/admin/faculty/{faculty_uuid}", headers=admin_headers)
        assert res_fac_get.status_code == 200, f"Failed to get faculty: {res_fac_get.text}"
        fac_record = res_fac_get.json()["data"]
        assert fac_record["id"] == faculty_uuid
        print(f"✅ Fetched single faculty record: {fac_record['name']} ({fac_record['designation']})")

        # Student cannot edit faculty record via admin endpoint
        res_fac_unauth = requests.patch(f"{BASE_URL}/admin/faculty/{faculty_uuid}", headers=student_headers, json={"designation": "Hacker"})
        assert res_fac_unauth.status_code == 403, f"Expected 403 for student editing faculty, got {res_fac_unauth.status_code}"
        print("✅ RBAC passed: Student blocked from editing faculty record (403).")


        print_step("52. PATCH /api/admin/faculty/{id} (Update Faculty Details)")
        fac_update = {
            "designation": "Associate Professor"
        }
        res_fac_patch = requests.patch(f"{BASE_URL}/admin/faculty/{faculty_uuid}", headers=admin_headers, json=fac_update)
        assert res_fac_patch.status_code == 200, f"Failed to patch faculty: {res_fac_patch.text}"
        patched_fac = res_fac_patch.json()["data"]
        assert patched_fac["designation"] == "Associate Professor"
        print("✅ Faculty details updated successfully.")

        print_step("53. PATCH /api/admin/faculty/{id}/status (Update Faculty Lifecycle Status)")
        fac_status = {
            "account_status": "active",
            "employment_status": "active",
            "status_note": "Promoted to Associate Professor"
        }
        res_fac_stat = requests.patch(f"{BASE_URL}/admin/faculty/{faculty_uuid}/status", headers=admin_headers, json=fac_status)
        assert res_fac_stat.status_code == 200, f"Failed to patch faculty status: {res_fac_stat.text}"

        res_fac_final = requests.get(f"{BASE_URL}/admin/faculty/{faculty_uuid}", headers=admin_headers)
        assert res_fac_final.status_code == 200
        final_fac = res_fac_final.json()["data"]
        assert final_fac["employment_status"] == "active"
        assert final_fac["status_note"] == "Promoted to Associate Professor"
        print("✅ Faculty lifecycle status updated and verified.")
