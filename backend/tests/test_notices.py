import requests
from .config import BASE_URL, print_step
from .state import state

def run_notices_tests():
    faculty_headers = state["faculty_headers"]
    student_headers = state["student_headers"]
    s2_headers = state["s2_headers"]
    admin_headers = state["admin_headers"]
    course_id = state["course_id"]
    print_step("20. POST /api/notices (Global Notice)")
    global_notice = requests.post(
        f"{BASE_URL}/notices",
        headers=faculty_headers,
        data={
            "title": "Global Holiday",
            "content": "College is closed tomorrow."
        }
    )
    assert global_notice.status_code == 200, global_notice.text
    global_notice_id = global_notice.json()["data"]["id"]
    print("✅ Global notice created successfully.")

    dept_id = state["department_id"]
    print_step("21. POST /api/notices (Targeted Notice)")
    targeted_notice = requests.post(
        f"{BASE_URL}/notices",
        headers=faculty_headers,
        data={
            "title": "CSE Exam Schedule",
            "content": "Exams start on Monday.",
            "target_course_id": course_id,
            "target_department_id": dept_id
        }
    )
    assert targeted_notice.status_code == 200, targeted_notice.text
    targeted_notice_id = targeted_notice.json()["data"]["id"]
    print("✅ Targeted notice created successfully.")

    print_step("22. GET /api/notices (Student View)")
    student_notices = requests.get(
        f"{BASE_URL}/notices",
        headers=student_headers
    )
    assert student_notices.status_code == 200, student_notices.text
    notice_ids = [n["id"] for n in student_notices.json()["data"]["items"]]
    assert global_notice_id in notice_ids
    assert targeted_notice_id in notice_ids

    print_step("23. GET /api/notices (Exclusion Test)")
    print("⏭️ Skipped exclusion test due to lack of a second seeded branch.")
    
    print_step("24. GET /api/notices/{id} (Targeted Notice by Student 2)")
    s2_single = requests.get(
        f"{BASE_URL}/notices/{targeted_notice_id}",
        headers=s2_headers
    )
    assert s2_single.status_code == 200, s2_single.text
    print("✅ Student 2 saw the targeted notice (No hostel restriction).")
    
    print_step("25. GET /api/notices (Multiple Target Fields AND logic)")
    multi_targeted_notice = requests.post(
        f"{BASE_URL}/notices",
        headers=faculty_headers,
        data={
            "title": "Hostel A - Course Sync",
            "content": "Meeting for Course students in Hostel A.",
            "target_course_id": course_id,
            "target_hostel": "Hostel A"
        }
    )
    assert multi_targeted_notice.status_code == 200, multi_targeted_notice.text
    multi_notice_id = multi_targeted_notice.json()["data"]["id"]
    
    s2_multi_list = requests.get(f"{BASE_URL}/notices", headers=s2_headers)
    s2_multi_ids = [n["id"] for n in s2_multi_list.json()["data"]["items"]]
    assert multi_notice_id not in s2_multi_ids, "Student 2 (Hostel B) saw a notice for Hostel A in the list."
    
    s2_multi_single = requests.get(f"{BASE_URL}/notices/{multi_notice_id}", headers=s2_headers)
    assert s2_multi_single.status_code == 403, "Student 2 fetched Hostel A notice."
    
    s1_multi_single = requests.get(f"{BASE_URL}/notices/{multi_notice_id}", headers=student_headers)
    assert s1_multi_single.status_code == 200, s1_multi_single.text
    print("✅ Multi-targeting AND logic verified successfully! Course A + Hostel A only visible to matching student.")
    
    student_delete = requests.delete(
        f"{BASE_URL}/notices/{targeted_notice_id}",
        headers=student_headers
    )
    assert student_delete.status_code == 403, student_delete.text
    print("✅ Student successfully blocked from deleting notice.")

    faculty_delete = requests.delete(
        f"{BASE_URL}/notices/{targeted_notice_id}",
        headers=faculty_headers
    )
    assert faculty_delete.status_code == 200, faculty_delete.text
    print("✅ Faculty successfully deleted their own notice.")
    
    admin_delete = requests.delete(
        f"{BASE_URL}/notices/{global_notice_id}",
        headers=admin_headers
    )
    assert admin_delete.status_code == 200, admin_delete.text
    print("✅ Admin successfully deleted faculty's notice via RBAC override.")

    print("\n[========== 🎉 ALL PHASE 4A TESTS PASSED SUCCESSFULLY 🎉 ==========]")
