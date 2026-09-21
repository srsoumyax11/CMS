import requests
from datetime import datetime, timedelta, timezone
from .config import BASE_URL, print_step, FACULTY_PASSWORD, random_suffix
from .state import state

def run_attendance_tests():
    student_headers = state["student_headers"]
    faculty_headers = state["faculty_headers"]
    admin_headers = state["admin_headers"]
    student_uuid = state["student_uuid"]
    s2_id = state["student2_uuid"]
    slot_id = state["slot_id"]
    course_id = state["course_id"]
    branch_id = state["branch_id"]
    fac_id = state["faculty_uuid"]

    now = datetime.now(timezone.utc)

    print_step("32. GET /api/attendance/roster/{slot_id}")
    rost_s1 = requests.get(f"{BASE_URL}/attendance/roster/{slot_id}", headers=student_headers)
    assert rost_s1.status_code == 403
    print("✅ Student blocked from fetching roster.")
    
    fac2_email = f"fac2_{random_suffix}@example.com"
    requests.post(f"{BASE_URL}/admin/faculty", headers=admin_headers, json={
        "email": fac2_email, "name": "Faculty Two", "department": "CSE", "designation": "Assistant Professor", "user_id": f"FAC2{random_suffix}", "password": FACULTY_PASSWORD
    })
    r_fac2_login = requests.post(f"{BASE_URL}/auth/login", json={"email": fac2_email, "password": FACULTY_PASSWORD})
    fac2_token = r_fac2_login.json()["data"]["access_token"]
    fac2_headers = {"Authorization": f"Bearer {fac2_token}"}
    
    rost_f2 = requests.get(f"{BASE_URL}/attendance/roster/{slot_id}", headers=fac2_headers)
    assert rost_f2.status_code == 403
    print("✅ Second faculty member (cross-tenant) blocked from fetching roster.")

    rost_fac = requests.get(f"{BASE_URL}/attendance/roster/{slot_id}", headers=faculty_headers)
    assert rost_fac.status_code == 200, rost_fac.text
    roster_data = rost_fac.json()["data"]
    
    found_s1 = False
    for st in roster_data:
        if st["student_id"] == student_uuid:
            found_s1 = True
    assert found_s1, "Student 1 not found in roster"
    print("✅ Roster fetched correctly for authorized faculty.")

    print_step("33. POST /api/attendance/batch (Validations & Upsert)")
    attendance_date = now.strftime("%Y-%m-%d")
    
    future_date = (now + timedelta(days=7)).strftime("%Y-%m-%d")
    batch_data_future = {
        "slot_id": slot_id,
        "date": future_date,
        "records": [{"student_id": student_uuid, "status": "present"}]
    }
    att_future = requests.post(f"{BASE_URL}/attendance/batch", headers=faculty_headers, json=batch_data_future)
    assert att_future.status_code == 422
    print("✅ Time-Traveler bug blocked (future date rejected).")

    tomorrow_day = (now + timedelta(days=1)).strftime("%A").lower()
    slot_tmrw_data = {
        "course_id": course_id,
        "branch_id": branch_id,
        "year": 2024,
        "subject_name": "Database Systems",
        "faculty_id": fac_id,
        "day_of_week": tomorrow_day,
        "start_time": "14:00:00",
        "end_time": "15:00:00",
        "room": "Room 101"
    }
    ts_tmrw = requests.post(f"{BASE_URL}/timetable", headers=admin_headers, json=slot_tmrw_data)
    slot_tmrw_id = ts_tmrw.json()["data"]["id"]

    batch_mismatch = {
        "slot_id": slot_tmrw_id,
        "date": attendance_date,
        "records": []
    }
    att_mismatch = requests.post(f"{BASE_URL}/attendance/batch", headers=faculty_headers, json=batch_mismatch)
    assert att_mismatch.status_code == 400
    print("✅ Day-Mismatch bug blocked.")

    fake_student_id = "00000000-0000-0000-0000-000000000000"
    batch_ghost = {
        "slot_id": slot_id,
        "date": attendance_date,
        "records": [{"student_id": fake_student_id, "status": "present"}]
    }
    att_ghost = requests.post(f"{BASE_URL}/attendance/batch", headers=faculty_headers, json=batch_ghost)
    assert att_ghost.status_code == 400
    print("✅ Ghost Student Exploit blocked.")

    batch_valid = {
        "slot_id": slot_id,
        "date": attendance_date,
        "records": [
            {"student_id": student_uuid, "status": "absent"},
            {"student_id": s2_id, "status": "absent"}
        ]
    }
    att_ok1 = requests.post(f"{BASE_URL}/attendance/batch", headers=faculty_headers, json=batch_valid)
    assert att_ok1.status_code == 200, att_ok1.text

    batch_valid["records"][0]["status"] = "present"
    att_ok2 = requests.post(f"{BASE_URL}/attendance/batch", headers=faculty_headers, json=batch_valid)
    assert att_ok2.status_code == 200, att_ok2.text
    print("✅ PostgreSQL Bulk Upsert completed successfully without constraint crashing.")

    print_step("34. GET /api/attendance/mine/stats")
    stats_s1 = requests.get(f"{BASE_URL}/attendance/mine/stats", headers=student_headers)
    assert stats_s1.status_code == 200
    stat_data = stats_s1.json()["data"]
    assert len(stat_data) == 1
    assert stat_data[0]["subject_name"] == "Database Systems"
    assert stat_data[0]["present"] == 1
    assert stat_data[0]["absent"] == 0
    print("✅ Attendance stats computed successfully.")

    print("\n[========== 🎉 ALL PHASE 4C TESTS PASSED SUCCESSFULLY 🎉 ==========]")
