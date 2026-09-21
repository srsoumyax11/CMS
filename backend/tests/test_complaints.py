import requests
from .config import BASE_URL, print_step
from .state import state

def run_complaints_tests():
    student_headers = state["student_headers"]
    s2_headers = state["s2_headers"]
    admin_headers = state["admin_headers"]
    s2_id = state["student2_uuid"]
    fac_id = state["faculty_token"] # Wait, faculty user id isn't in state! We need to fix this.
    # Actually, in step 9, fac_id = res_json["data"]["user_uuid"] was used. I need to store this in state.
    
    # I will fetch faculty ID by extracting it from `state["faculty_uuid"]` once I update test_rbac.py
    fac_id = state.get("faculty_uuid")

    print_step("12. POST /api/complaints (Student 1 - Public)")
    c1_res = requests.post(
        f"{BASE_URL}/complaints",
        headers=student_headers,
        data={
            "category": "electrical",
            "location_hostel": "Hostel A",
            "description": "Fan is making a weird noise.",
            "visibility": "public"
        }
    )
    assert c1_res.status_code == 200, c1_res.text
    c1_id = c1_res.json()["data"]["id"]
    state["complaint_id"] = c1_id
    print("✅ Public complaint created successfully.")
    
    print_step("13. POST /api/complaints (Student 1 - Private)")
    c2_res = requests.post(
        f"{BASE_URL}/complaints",
        headers=student_headers,
        data={
            "category": "security",
            "location_hostel": "Hostel A",
            "description": "Someone tried to open my door at 2am.",
            "visibility": "private"
        }
    )
    assert c2_res.status_code == 200, c2_res.text
    c2_id = c2_res.json()["data"]["id"]
    state["complaint2_id"] = c2_id
    print("✅ Private complaint created successfully.")
    
    print_step("14. Rate Limiting Check on Complaints")
    requests.post(f"{BASE_URL}/complaints", headers=student_headers, data={"category": "wifi", "location_hostel": "Hostel A", "description": "1", "visibility": "public"})
    rl_res = requests.post(f"{BASE_URL}/complaints", headers=student_headers, data={"category": "wifi", "location_hostel": "Hostel A", "description": "2", "visibility": "public"})
    assert rl_res.status_code == 429
    print("✅ Rate limit successfully caught 4th complaint within 1 hour.")
    
    print_step("15. GET /api/complaints/{id} (Privacy Enforcement)")
    s2_view_c1 = requests.get(f"{BASE_URL}/complaints/{c1_id}", headers=s2_headers)
    assert s2_view_c1.status_code == 200
    
    s2_view_c2 = requests.get(f"{BASE_URL}/complaints/{c2_id}", headers=s2_headers)
    assert s2_view_c2.status_code == 403
    
    admin_view_c2 = requests.get(f"{BASE_URL}/complaints/{c2_id}", headers=admin_headers)
    assert admin_view_c2.status_code == 200
    print("✅ Visibility logic perfectly enforced (Owner / Public / Private).")
    
    print_step("16. PATCH /api/complaints/{id}/cancel (Self-Cancel)")
    cancel_res = requests.patch(
        f"{BASE_URL}/complaints/{c1_id}/cancel",
        headers=student_headers
    )
    assert cancel_res.status_code == 200, cancel_res.text
    assert cancel_res.json()["data"]["status"] == "cancelled"
    print("✅ Self-cancellation of open complaint successful.")
    
    print_step("17. PATCH /api/admin/complaints/{id}/status (State Machine Removed)")
    invalid_patch = requests.patch(
        f"{BASE_URL}/complaints/{c1_id}/status",
        headers=admin_headers,
        json={"status": "resolved"}
    )
    assert invalid_patch.status_code == 200, invalid_patch.text
    print("✅ State machine successfully allowed any transition (Cancelled -> Resolved).")
    
    valid_patch = requests.patch(
        f"{BASE_URL}/complaints/{c2_id}/status",
        headers=admin_headers,
        json={"status": "in_progress", "note": "Investigating."}
    )
    assert valid_patch.status_code == 200
    assert valid_patch.json()["data"]["status"] == "in_progress"
    print("✅ Admin valid status transition successful.")
    
    print_step("18. PATCH /api/admin/complaints/{id}/assign (Role Validation)")
    invalid_assign = requests.patch(
        f"{BASE_URL}/complaints/{c2_id}/assign",
        headers=admin_headers,
        json={"assigned_to": s2_id}
    )
    assert invalid_assign.status_code == 422, invalid_assign.text
    
    valid_assign = requests.patch(
        f"{BASE_URL}/complaints/{c2_id}/assign",
        headers=admin_headers,
        json={"assigned_to": fac_id}
    )
    assert valid_assign.status_code == 200, valid_assign.text
    print("✅ Assignee role validation successfully blocked Student and allowed Faculty.")
    
    print_step("19. GET /api/admin/complaints/analytics/recurring")
    analytics_res = requests.get(
        f"{BASE_URL}/complaints/analytics/recurring",
        headers=admin_headers
    )
    assert analytics_res.status_code == 200
    items = analytics_res.json()["data"]
    
    if items:
        assert "description" not in items[0]
        assert "raised_by" not in items[0]
        print("✅ Recurring analytics aggregate returned correctly without sensitive fields.")
        
    print("\n[========== 🎉 ALL PHASE 2 & 3 TESTS PASSED SUCCESSFULLY 🎉 ==========]")
