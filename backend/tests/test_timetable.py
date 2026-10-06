import requests
import random
from datetime import datetime, timezone
from .config import BASE_URL, print_step
from .state import state

def run_timetable_tests():
    student_headers = state["student_headers"]
    admin_headers = state["admin_headers"]
    course_id = state["course_id"]
    fac_id = state["faculty_uuid"]
    
    now = datetime.now(timezone.utc)
    test_room = f"Room {random.randint(100, 999)}"

    print_step("30. POST /api/timetable (Admin creates Timetable Slot)")
    slot_data = {
        "course_id": course_id,
        "department_id": state.get("department_id"),
        "year": 1,
        "subject_name": "Database Systems",
        "faculty_id": fac_id,
        "day_of_week": now.strftime("%A").lower(), 
        "start_time": "10:00:00",
        "end_time": "11:00:00",
        "room": test_room
    }

    ts_stud = requests.post(f"{BASE_URL}/timetable", headers=student_headers, json=slot_data)
    assert ts_stud.status_code == 403
    print("✅ Unauthorized CRUD: Student blocked from creating timetable.")

    ts_res = requests.post(f"{BASE_URL}/timetable", headers=admin_headers, json=slot_data)
    assert ts_res.status_code == 200, ts_res.text
    slot_id = ts_res.json()["data"]["id"]
    state["slot_id"] = slot_id
    print("✅ Admin created timetable slot successfully.")

    print_step("31. POST /api/timetable (Double Booking Validation)")
    overlap_slot_data = slot_data.copy()
    overlap_slot_data["start_time"] = "10:30:00"
    overlap_slot_data["end_time"] = "11:30:00"
    
    overlap_res = requests.post(f"{BASE_URL}/timetable", headers=admin_headers, json=overlap_slot_data)
    assert overlap_res.status_code == 400
    print("✅ Double-booking bug successfully caught.")

