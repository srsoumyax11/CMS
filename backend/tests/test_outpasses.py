import requests
from datetime import datetime, timedelta, timezone
from .config import BASE_URL, print_step
from .state import state

def run_outpasses_tests():
    student_headers = state["student_headers"]
    s2_headers = state["s2_headers"]
    admin_headers = state["admin_headers"]

    now = datetime.now(timezone.utc)
    
    outpass_data = {
        "destination": "Home",
        "reason": "Family visit",
        "departure_time": (now + timedelta(hours=1)).isoformat(),
        "expected_return_time": (now + timedelta(hours=48)).isoformat()
    }
    
    print_step("26. POST /api/outpasses (Create, Overlap, & Date Validation)")
    invalid_date_data = {
        "destination": "Market",
        "reason": "Shopping",
        "departure_time": (now + timedelta(hours=48)).isoformat(),
        "expected_return_time": (now + timedelta(hours=1)).isoformat()
    }
    op_res_invalid = requests.post(f"{BASE_URL}/outpasses", headers=student_headers, json=invalid_date_data)
    assert op_res_invalid.status_code == 422, "Expected 422 for departure_time >= expected_return_time"
    print("✅ Negative test passed: Invalid dates (departure > return) caught (422).")
    
    op_res = requests.post(f"{BASE_URL}/outpasses", headers=student_headers, json=outpass_data)
    assert op_res.status_code == 200, op_res.text
    outpass_id = op_res.json()["data"]["id"]
    state["outpass_id"] = outpass_id
    print("✅ Student A created outpass successfully.")
    
    op_res_overlap = requests.post(f"{BASE_URL}/outpasses", headers=student_headers, json=outpass_data)
    assert op_res_overlap.status_code == 400, "Expected 400 for overlapping outpass"
    print("✅ Overlap validation blocked overlapping outpass.")
    
    print_step("27. GET /api/outpasses/{id} (IDOR & Admin Access)")
    op_s2 = requests.get(f"{BASE_URL}/outpasses/{outpass_id}", headers=s2_headers)
    assert op_s2.status_code == 403, f"IDOR Vulnerability: Student B viewed Student A's outpass! Status: {op_s2.status_code} Body: {op_s2.text}"
    print("✅ IDOR Regression: Student B blocked from viewing Student A's outpass.")
    
    op_s1 = requests.get(f"{BASE_URL}/outpasses/{outpass_id}", headers=student_headers)
    assert op_s1.status_code == 200
    print("✅ Owner successfully fetched their own outpass.")
    
    op_admin = requests.get(f"{BASE_URL}/outpasses/{outpass_id}", headers=admin_headers)
    assert op_admin.status_code == 200
    print("✅ Admin successfully fetched student's outpass.")
    
    admin_list_s1 = requests.get(f"{BASE_URL}/outpasses", headers=student_headers)
    assert admin_list_s1.status_code == 403
    print("✅ Collection RBAC: Non-admin blocked from admin list route.")
    
    cancel_s2 = requests.patch(f"{BASE_URL}/outpasses/{outpass_id}/cancel", headers=s2_headers)
    assert cancel_s2.status_code == 403
    print("✅ Student B blocked from cancelling Student A's outpass.")
    
    print_step("28. PATCH /api/admin/outpasses/{id}/* (State Machine & Happy Path)")
    invalid_transition = requests.patch(f"{BASE_URL}/outpasses/{outpass_id}/depart", headers=admin_headers)
    assert invalid_transition.status_code == 422
    print("✅ Invalid transition (pending -> active) blocked cleanly.")
    
    appr_res = requests.patch(f"{BASE_URL}/outpasses/{outpass_id}/approve", headers=admin_headers)
    assert appr_res.status_code == 200, appr_res.text
    
    dep_res = requests.patch(f"{BASE_URL}/outpasses/{outpass_id}/depart", headers=admin_headers)
    assert dep_res.status_code == 200, dep_res.text
    
    ret_res = requests.patch(f"{BASE_URL}/outpasses/{outpass_id}/return", headers=admin_headers)
    assert ret_res.status_code == 200, ret_res.text
    
    ret_data = ret_res.json()["data"]
    assert ret_data["status"] == "completed"
    assert ret_data["is_overdue"] is False
    assert ret_data["overdue_hours"] == 0
    print("✅ Happy Path lifecycle completed successfully. is_overdue is False.")
    
    print_step("29. Outpass Overdue Path (Retroactive setup)")
    overdue_data = {
        "destination": "Market",
        "reason": "Shopping",
        "departure_time": (now - timedelta(hours=5)).isoformat(),
        "expected_return_time": (now - timedelta(hours=2)).isoformat()
    }
    od_res = requests.post(f"{BASE_URL}/outpasses", headers=student_headers, json=overdue_data)
    od_id = od_res.json()["data"]["id"]
    requests.patch(f"{BASE_URL}/outpasses/{od_id}/approve", headers=admin_headers)
    requests.patch(f"{BASE_URL}/outpasses/{od_id}/depart", headers=admin_headers)
    od_ret = requests.patch(f"{BASE_URL}/outpasses/{od_id}/return", headers=admin_headers)
    od_data = od_ret.json()["data"]
    
    assert od_data["status"] == "completed"
    assert od_data["is_overdue"] is True
    assert od_data["overdue_hours"] > 0
    print(f"✅ Overdue Path verified. overdue_hours: {od_data['overdue_hours']}")
    
    print("\n[========== 🎉 ALL PHASE 4B TESTS PASSED SUCCESSFULLY 🎉 ==========]")
