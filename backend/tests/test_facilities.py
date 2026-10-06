import requests
from .config import BASE_URL, print_step, random_suffix
from .state import state

def run_facilities_tests():
    print_step("72. POST /api/visitors/enter (Create Visitor Log)")
    admin_headers = state.get("admin_headers")
    student_token = state.get("student_token")
    
    # We need the visitor:manage permission which Admin has.
    res = requests.post(
        f"{BASE_URL}/visitors/enter",
        headers=admin_headers,
        json={
            "visitor_name": "Test Visitor",
            "purpose": "Campus Tour"
        }
    )
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    visitor_id = res.json()["data"]["id"]
    print(f"✅ Visitor entry logged successfully: {visitor_id}")

    print_step("73. PATCH /api/visitors/{id}/exit (Visitor Exit)")
    res = requests.patch(
        f"{BASE_URL}/visitors/{visitor_id}/exit",
        headers=admin_headers
    )
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    assert res.json()["data"]["status"] == "exited"
    print("✅ Visitor exit logged successfully.")

    print_step("74. GET /api/visitors (List Visitors)")
    res = requests.get(
        f"{BASE_URL}/visitors",
        headers=admin_headers
    )
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    assert len(res.json()["data"]) > 0
    print("✅ Visitor logs listed successfully.")

    print_step("75. POST /api/finance (Create Fee Due)")
    student_id = state.get("student_uuid")
    if not student_id:
        print("⏭️ Skipped fee creation due to missing student_uuid in state.")
    else:
        res = requests.post(
            f"{BASE_URL}/finance",
            headers=admin_headers,
            json={
                "student_id": student_id,
                "description": "Tuition Fee Semester 1",
                "total_amount": 50000.0,
                "due_date": "2026-12-31T00:00:00Z"
            }
        )
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        fee_id = res.json()["data"]["id"]
        print(f"✅ Fee due created successfully: {fee_id}")

        print_step("76. GET /api/finance/mine (Student list fees)")
        student_headers = state.get("student_headers")
        res = requests.get(
            f"{BASE_URL}/finance/mine",
            headers=student_headers
        )
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        assert len(res.json()["data"]) > 0
        print("✅ Student successfully fetched their fee dues.")

    print_step("77. POST /api/hostel/allocations (Hostel Allocation)")
    room_id = state.get("test_room_id")
    if not room_id:
        res = requests.get(f"{BASE_URL}/infrastructure/buildings", headers=admin_headers)
        buildings = res.json().get("data", [])
        for b in buildings:
            res_r = requests.get(f"{BASE_URL}/infrastructure/buildings/{b['id']}/rooms", headers=admin_headers)
            rooms = res_r.json().get("data", [])
            if rooms:
                room_id = rooms[0]["id"]
                break
            
    if not room_id or not student_id:
        print("⏭️ Skipped hostel allocation due to missing room_id or student_uuid.")
    else:
        res = requests.post(
            f"{BASE_URL}/hostel/allocations",
            headers=admin_headers,
            json={
                "student_id": student_id,
                "room_id": room_id
            }
        )
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        alloc_id = res.json()["data"]["id"]
        print(f"✅ Hostel room allocated successfully: {alloc_id}")

        print_step("78. GET /api/hostel/mine (Student check allocation)")
        res = requests.get(
            f"{BASE_URL}/hostel/mine",
            headers=student_headers
        )
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        assert res.json()["data"]["id"] == alloc_id
        print("✅ Student successfully viewed their active allocation.")

    print("\n[========== 🎉 ALL FACILITIES & INFRASTRUCTURE TESTS PASSED 🎉 ==========]")
