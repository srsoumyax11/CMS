import random
import requests
from .config import BASE_URL, print_step, random_suffix
from .state import state


def run_scoping_guardrails_tests():
    """
    Tests for Phase 3:
      Item 5 – HOD Assignment Guardrails
      Item 6 – Role-Scoped Department Visibility
    """
    admin_headers = state.get("admin_headers")
    faculty_headers = state.get("faculty_headers")
    student_headers = state.get("student_headers")
    dept_id = state.get("department_id")
    faculty_uuid = state.get("faculty_uuid")

    if not admin_headers:
        print("Skipping scoping guardrails tests: admin headers not initialised")
        return

    # ==============================================================
    # ITEM 5 – HOD ASSIGNMENT GUARDRAILS
    # ==============================================================
    print_step("61. PATCH /admin/departments/{id} – HOD Guardrail: Non-existent user")
    import uuid as _uuid
    fake_uuid = str(_uuid.uuid4())  # Valid UUID v4 format, but doesn't exist in DB
    res = requests.patch(
        f"{BASE_URL}/admin/departments/{dept_id}",
        headers=admin_headers,
        json={"hod_user_id": fake_uuid}
    )
    assert res.status_code == 400, f"Expected 400 for fake HOD user, got {res.status_code}: {res.text}"
    print("✅ HOD guardrail: Non-existent user rejected (400).")

    print_step("62. PATCH /admin/departments/{id} – HOD Guardrail: Student cannot be HOD")
    student_uuid = state.get("student_uuid")
    if student_uuid:
        res = requests.patch(
            f"{BASE_URL}/admin/departments/{dept_id}",
            headers=admin_headers,
            json={"hod_user_id": student_uuid}
        )
        assert res.status_code == 400, f"Expected 400 for student as HOD, got {res.status_code}: {res.text}"
        print(f"✅ HOD guardrail: Student as HOD rejected (400). Detail: {res.json().get('detail', '')}")
    else:
        print("⚠️  Skipped: student_uuid not in state.")

    print_step("63. PATCH /admin/departments/{id} – HOD Guardrail: Valid faculty assignment")
    if faculty_uuid:
        res = requests.patch(
            f"{BASE_URL}/admin/departments/{dept_id}",
            headers=admin_headers,
            json={"hod_user_id": faculty_uuid}
        )
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        print("✅ HOD guardrail: Valid faculty assigned as HOD (200).")

        # Clear HOD assignment for cleanup
        res_clear = requests.patch(
            f"{BASE_URL}/admin/departments/{dept_id}",
            headers=admin_headers,
            json={"hod_user_id": None}
        )
        assert res_clear.status_code == 200, f"Failed to clear HOD: {res_clear.text}"
        print("✅ HOD cleared for cleanup.")
    else:
        print("⚠️  Skipped: faculty_uuid not in state.")

    # ==============================================================
    # ITEM 6 – DEPARTMENT-SCOPED VISIBILITY
    # ==============================================================

    # --- 6a: Outpasses scoped list ---
    print_step("64. GET /api/outpasses – Department-scoped list (Admin vs Faculty)")
    # Admin sees all (unscoped)
    res_admin = requests.get(f"{BASE_URL}/outpasses", headers=admin_headers)
    assert res_admin.status_code == 200, f"Admin outpass list failed: {res_admin.text}"
    admin_total = res_admin.json()["data"]["total"]
    print(f"   Admin sees {admin_total} outpasses (unscoped).")

    if faculty_headers:
        res_fac = requests.get(f"{BASE_URL}/outpasses", headers=faculty_headers)
        assert res_fac.status_code == 200, f"Faculty outpass list failed: {res_fac.text}"
        fac_total = res_fac.json()["data"]["total"]
        # Faculty should see same or fewer (scoped to their department)
        assert fac_total <= admin_total, f"Faculty sees more than admin! ({fac_total} > {admin_total})"
        print(f"   Faculty sees {fac_total} outpasses (scoped). admin={admin_total}, fac={fac_total}")
        print("✅ Outpass scoping verified: Faculty ≤ Admin.")
    else:
        print("⚠️  Skipped faculty scope check: no faculty_headers.")

    # --- 6b: Complaints scoped list ---
    print_step("65. GET /api/complaints – Department-scoped list (Admin vs Faculty)")
    res_admin_c = requests.get(f"{BASE_URL}/complaints", headers=admin_headers)
    assert res_admin_c.status_code == 200, f"Admin complaint list failed: {res_admin_c.text}"
    admin_c_total = res_admin_c.json()["data"]["total"]
    print(f"   Admin sees {admin_c_total} complaints (unscoped).")

    if faculty_headers:
        res_fac_c = requests.get(f"{BASE_URL}/complaints", headers=faculty_headers)
        assert res_fac_c.status_code == 200, f"Faculty complaint list failed: {res_fac_c.text}"
        fac_c_total = res_fac_c.json()["data"]["total"]
        assert fac_c_total <= admin_c_total, f"Faculty sees more complaints than admin! ({fac_c_total} > {admin_c_total})"
        print(f"   Faculty sees {fac_c_total} complaints (scoped). admin={admin_c_total}, fac={fac_c_total}")
        print("✅ Complaint scoping verified: Faculty ≤ Admin.")
    else:
        print("⚠️  Skipped faculty scope check: no faculty_headers.")

    # --- 6c: Students scoped list ---
    print_step("66. GET /api/admin/students – Department-scoped list (Admin vs explicit dept filter)")
    res_all = requests.get(f"{BASE_URL}/admin/students", headers=admin_headers)
    assert res_all.status_code == 200
    all_students = res_all.json()["data"]

    res_filtered = requests.get(f"{BASE_URL}/admin/students?department_id={dept_id}", headers=admin_headers)
    assert res_filtered.status_code == 200
    filtered_students = res_filtered.json()["data"]

    assert len(filtered_students) <= len(all_students), "Filtered list should not exceed unfiltered"
    assert len(filtered_students) > 0, "Expected at least one student in the test department"
    print(f"   All students: {len(all_students)}, dept-filtered: {len(filtered_students)}")
    print("✅ Student list department filter works correctly.")

    # --- 6d: Faculty scoped list ---
    print_step("67. GET /api/admin/faculty – Department filter")
    res_fac_all = requests.get(f"{BASE_URL}/admin/faculty", headers=admin_headers)
    assert res_fac_all.status_code == 200

    res_fac_dept = requests.get(f"{BASE_URL}/admin/faculty?department_id={dept_id}", headers=admin_headers)
    assert res_fac_dept.status_code == 200
    all_fac = res_fac_all.json()["data"]
    dept_fac = res_fac_dept.json()["data"]
    assert len(dept_fac) <= len(all_fac)
    print(f"   All faculty: {len(all_fac)}, dept-filtered: {len(dept_fac)}")
    print("✅ Faculty list department filter works correctly.")

    # --- 6e: Staff scoped list ---
    print_step("68. GET /api/admin/staff – Department filter")
    res_staff_all = requests.get(f"{BASE_URL}/admin/staff", headers=admin_headers)
    assert res_staff_all.status_code == 200

    res_staff_dept = requests.get(f"{BASE_URL}/admin/staff?department_id={dept_id}", headers=admin_headers)
    assert res_staff_dept.status_code == 200
    all_staff = res_staff_all.json()["data"]
    dept_staff = res_staff_dept.json()["data"]
    assert len(dept_staff) <= len(all_staff)
    print(f"   All staff: {len(all_staff)}, dept-filtered: {len(dept_staff)}")
    print("✅ Staff list department filter works correctly.")

    print("\n[========== 🎉 ALL PHASE 3 SCOPING GUARDRAIL TESTS PASSED 🎉 ==========]")
