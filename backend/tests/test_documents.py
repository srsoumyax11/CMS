import pytest
import requests
from .config import BASE_URL, print_step
from .state import state

def run_documents_tests():
    student_headers = state.get("student_headers")
    s2_headers = state.get("s2_headers")
    admin_headers = state.get("admin_headers")

    if not student_headers or not admin_headers:
        print("Skipping document tests: auth headers not initialized in state")
        return

    print_step("35. POST /api/documents/requests (Create Document Request)")
    req_payload = {
        "document_type": "bonafide",
        "purpose": "Applying for government education scholarship 2026",
        "urgency": "normal"
    }
    res = requests.post(f"{BASE_URL}/documents/requests", headers=student_headers, json=req_payload)
    assert res.status_code == 201, f"Failed to create request: {res.text}"
    body = res.json()
    assert body["success"] is True
    doc_id = body["data"]["id"]
    assert body["data"]["status"] == "pending"
    assert body["data"]["document_type"] == "bonafide"
    print(f"✅ Student successfully submitted document request: {doc_id}")

    print_step("36. GET /api/documents/requests/mine (List Student's Own Requests)")
    res = requests.get(f"{BASE_URL}/documents/requests/mine", headers=student_headers)
    assert res.status_code == 200, res.text
    mine_data = res.json()["data"]
    assert mine_data["total"] >= 1
    found = any(item["id"] == doc_id for item in mine_data["items"])
    assert found is True, "Submitted request not found in student's list"
    print("✅ Student successfully viewed their own document requests list.")

    print_step("37. GET /api/documents/requests/{id} (Access & IDOR Check)")
    # Student B should NOT be able to view Student A's document request
    if s2_headers:
        res_s2 = requests.get(f"{BASE_URL}/documents/requests/{doc_id}", headers=s2_headers)
        assert res_s2.status_code == 403, f"IDOR check failed: expected 403, got {res_s2.status_code}"
        print("✅ IDOR security check passed: Student B cannot view Student A's document request.")

    # Student A can view
    res_s1 = requests.get(f"{BASE_URL}/documents/requests/{doc_id}", headers=student_headers)
    assert res_s1.status_code == 200
    print("✅ Student A successfully viewed their own request details.")

    # Admin can view
    res_admin = requests.get(f"{BASE_URL}/documents/requests/{doc_id}", headers=admin_headers)
    assert res_admin.status_code == 200
    print("✅ Admin successfully viewed request details.")

    print_step("38. GET /api/admin/documents/requests (Admin List All Requests)")
    res_admin_list = requests.get(f"{BASE_URL}/admin/documents/requests", headers=admin_headers)
    assert res_admin_list.status_code == 200, res_admin_list.text
    admin_data = res_admin_list.json()["data"]
    assert admin_data["total"] >= 1
    print(f"✅ Admin listed all requests. Total in system: {admin_data['total']}")

    print_step("39. PATCH /api/admin/documents/requests/{id}/approve (Admin Approves)")
    approve_payload = {
        "admin_notes": "Application verified and approved by Academic Office."
    }
    res_approve = requests.patch(
        f"{BASE_URL}/admin/documents/requests/{doc_id}/approve",
        headers=admin_headers,
        json=approve_payload
    )
    assert res_approve.status_code == 200, res_approve.text
    approve_data = res_approve.json()["data"]
    assert approve_data["status"] == "approved"
    assert approve_data["processed_by"] is not None
    assert approve_data["processed_at"] is not None
    print("✅ Admin successfully approved document request with audit notes.")

    print_step("40. Download before ready check")
    res_dl_early = requests.get(f"{BASE_URL}/documents/requests/{doc_id}/download", headers=student_headers)
    assert res_dl_early.status_code == 400, "Expected 400 when downloading unissued document"
    print("✅ Negative test passed: Cannot download document before certificate is ready.")

    print_step("41. PATCH /api/admin/documents/requests/{id}/ready (Issue Certificate)")
    ready_payload = {
        "issued_file_url": "https://storage.college.edu/certificates/bonafide_2026_001.pdf",
        "admin_notes": "Certificate generated with official digital seal."
    }
    res_ready = requests.patch(
        f"{BASE_URL}/admin/documents/requests/{doc_id}/ready",
        headers=admin_headers,
        json=ready_payload
    )
    assert res_ready.status_code == 200, res_ready.text
    ready_data = res_ready.json()["data"]
    assert ready_data["status"] == "ready"
    assert ready_data["issued_file_url"] == ready_payload["issued_file_url"]
    print("✅ Admin issued certificate file and marked status ready.")

    print_step("42. GET /api/documents/requests/{id}/download (Download Ready Certificate)")
    res_dl = requests.get(f"{BASE_URL}/documents/requests/{doc_id}/download", headers=student_headers)
    assert res_dl.status_code == 200, res_dl.text
    dl_info = res_dl.json()["data"]
    assert dl_info["issued_file_url"] == ready_payload["issued_file_url"]
    print("✅ Student successfully retrieved download link for issued certificate.")

    print_step("43. Rejection Flow Verification")
    res_rej_req = requests.post(f"{BASE_URL}/documents/requests", headers=student_headers, json={
        "document_type": "transcript",
        "purpose": "For off-campus higher education internship application"
    })
    assert res_rej_req.status_code == 201
    rej_doc_id = res_rej_req.json()["data"]["id"]

    # Reject without reason -> validation error
    res_no_reason = requests.patch(
        f"{BASE_URL}/admin/documents/requests/{rej_doc_id}/reject",
        headers=admin_headers,
        json={"rejection_reason": ""}
    )
    assert res_no_reason.status_code == 422, "Expected 422 for empty rejection reason"
    print("✅ Validation passed: Mandatory rejection reason enforced.")

    # Valid reject
    res_rej = requests.patch(
        f"{BASE_URL}/admin/documents/requests/{rej_doc_id}/reject",
        headers=admin_headers,
        json={"rejection_reason": "Dues pending from previous semester. Please clear library dues first."}
    )
    assert res_rej.status_code == 200
    rej_data = res_rej.json()["data"]
    assert rej_data["status"] == "rejected"
    assert "Dues pending" in rej_data["rejection_reason"]
    assert rej_data["processed_by"] is not None
    print("✅ Admin successfully rejected request with reason and recorded audit log.")

if __name__ == "__main__":
    from .test_setup import run_setup
    run_setup()
    run_documents_tests()
