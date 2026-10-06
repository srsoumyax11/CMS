import requests
from .config import BASE_URL, print_step
from .state import state

def run_infrastructure_tests():
    student_headers = state.get("student_headers")
    admin_headers = state.get("admin_headers")
    dept_id = state.get("dept_id")

    if not admin_headers or not student_headers:
        print("Skipping infrastructure tests: auth headers not initialized in state")
        return

    print_step("44. POST /api/infrastructure/buildings (Create Building)")
    bldg_payload = {
        "name": "Aryabhata Academic Block",
        "code": "AAB-1",
        "building_type": "academic",
        "total_floors": 4,
        "is_active": True
    }
    # Student cannot create building
    res_unauth = requests.post(f"{BASE_URL}/infrastructure/buildings", headers=student_headers, json=bldg_payload)
    assert res_unauth.status_code == 403, f"Expected 403 for student creating building, got {res_unauth.status_code}"
    print("✅ RBAC passed: Student blocked from creating building.")

    # Admin creates building
    res_bldg = requests.post(f"{BASE_URL}/infrastructure/buildings", headers=admin_headers, json=bldg_payload)
    if res_bldg.status_code == 400 and "already exists" in res_bldg.text:
        # Already created in earlier run, fetch it
        list_res = requests.get(f"{BASE_URL}/infrastructure/buildings", headers=admin_headers)
        bldg_id = next(b["id"] for b in list_res.json()["data"] if b["code"] == "AAB-1")
    else:
        assert res_bldg.status_code == 201, f"Failed to create building: {res_bldg.text}"
        bldg_id = res_bldg.json()["data"]["id"]
    print(f"✅ Admin created building successfully: {bldg_id}")

    # Duplicate code validation
    res_dup = requests.post(f"{BASE_URL}/infrastructure/buildings", headers=admin_headers, json=bldg_payload)
    assert res_dup.status_code == 400, "Expected 400 for duplicate building code"
    print("✅ Validation passed: Duplicate building code rejected (400).")

    print_step("45. POST /api/infrastructure/rooms (Create Room in Building)")
    room_payload = {
        "building_id": bldg_id,
        "room_number": "LH-201",
        "floor": 2,
        "room_type": "lecture_hall",
        "capacity": 75,
        "department_id": dept_id,
        "is_active": True
    }
    # Student cannot create room
    res_room_unauth = requests.post(f"{BASE_URL}/infrastructure/rooms", headers=student_headers, json=room_payload)
    assert res_room_unauth.status_code == 403
    print("✅ RBAC passed: Student blocked from creating room.")

    # Admin creates room
    res_room = requests.post(f"{BASE_URL}/infrastructure/rooms", headers=admin_headers, json=room_payload)
    if res_room.status_code == 400 and "already exists" in res_room.text:
        list_rooms_res = requests.get(f"{BASE_URL}/infrastructure/rooms?building_id={bldg_id}", headers=admin_headers)
        room_id = next(r["id"] for r in list_rooms_res.json()["data"] if r["room_number"] == "LH-201")
    else:
        assert res_room.status_code == 201, f"Failed to create room: {res_room.text}"
        room_id = res_room.json()["data"]["id"]
    state["test_room_id"] = room_id
    state["test_building_id"] = bldg_id
    print(f"✅ Admin created room successfully: {room_id}")

    # Duplicate room number in same building validation
    res_dup_room = requests.post(f"{BASE_URL}/infrastructure/rooms", headers=admin_headers, json=room_payload)
    assert res_dup_room.status_code == 400, "Expected 400 for duplicate room number in building"
    print("✅ Validation passed: Duplicate room in same building rejected (400).")

    print_step("46. GET /api/infrastructure/buildings & rooms (Read access)")
    # Student can list buildings
    res_b_list = requests.get(f"{BASE_URL}/infrastructure/buildings", headers=student_headers)
    assert res_b_list.status_code == 200
    assert len(res_b_list.json()["data"]) >= 1
    print("✅ Student successfully viewed campus buildings list.")

    # Student can list rooms filtered by building
    res_r_list = requests.get(f"{BASE_URL}/infrastructure/rooms?building_id={bldg_id}", headers=student_headers)
    assert res_r_list.status_code == 200
    rooms = res_r_list.json()["data"]
    assert any(r["id"] == room_id for r in rooms)
    print("✅ Student successfully viewed rooms list filtered by building.")

    # Building detail includes rooms
    res_b_detail = requests.get(f"{BASE_URL}/infrastructure/buildings/{bldg_id}", headers=admin_headers)
    assert res_b_detail.status_code == 200
    b_detail = res_b_detail.json()["data"]
    assert any(r["id"] == room_id for r in b_detail["rooms"])
    print("✅ Building detail successfully returned with nested rooms list.")

if __name__ == "__main__":
    from .test_setup import run_setup
    run_setup()
    run_infrastructure_tests()
