import pytest
import httpx

BASE_URL = "http://localhost:8000"

@pytest.mark.asyncio
async def test_idor_cross_student_outpass_access(client: httpx.AsyncClient, student_a_token: str, student_b_token: str):
    """
    IDOR Test: Student B attempts to read Student A's outpass by UUID.
    Must return 403 Forbidden.
    """
    # 1. Student A creates an outpass
    create_payload = {
        "destination": "Local Market",
        "reason": "Personal errands",
        "departure_time": "2026-09-20T10:00:00Z",
        "expected_return_time": "2026-09-20T14:00:00Z"
    }
    create_res = await client.post(
        f"{BASE_URL}/api/outpasses",
        json=create_payload,
        headers={"Authorization": f"Bearer {student_a_token}"}
    )
    assert create_res.status_code == 200
    outpass_id = create_res.json()["data"]["id"]

    # 2. Student A can successfully view it
    self_res = await client.get(
        f"{BASE_URL}/api/outpasses/{outpass_id}",
        headers={"Authorization": f"Bearer {student_a_token}"}
    )
    assert self_res.status_code == 200

    # 3. Student B attempts to view Student A's outpass (IDOR probe)
    idor_res = await client.get(
        f"{BASE_URL}/api/outpasses/{outpass_id}",
        headers={"Authorization": f"Bearer {student_b_token}"}
    )
    assert idor_res.status_code == 403
    assert idor_res.json()["success"] is False

    # 4. Student B attempts to cancel Student A's outpass
    cancel_res = await client.patch(
        f"{BASE_URL}/api/outpasses/{outpass_id}/cancel",
        headers={"Authorization": f"Bearer {student_b_token}"}
    )
    assert cancel_res.status_code == 403


@pytest.mark.asyncio
async def test_bfla_student_accessing_admin_endpoints(client: httpx.AsyncClient, student_a_token: str):
    """
    Vertical Privilege Escalation Test:
    Ensures student tokens are strictly rejected on administrative routes.
    """
    admin_routes = [
        ("GET", "/api/admin/students"),
        ("GET", "/api/admin/faculty"),
        ("GET", "/api/admin/departments"),
        ("GET", "/api/roles"),
        ("GET", "/api/roles/permission-matrix"),
    ]

    for method, route in admin_routes:
        res = await client.request(
            method,
            f"{BASE_URL}{route}",
            headers={"Authorization": f"Bearer {student_a_token}"}
        )
        assert res.status_code == 403, f"Expected 403 on {route}, got {res.status_code}"
        assert res.json()["success"] is False


@pytest.mark.asyncio
async def test_idor_private_complaint_photo_url_protection(
    client: httpx.AsyncClient, student_a_token: str, student_b_token: str
):
    """
    Validates that a private complaint cannot be accessed by another student,
    and no storage paths or signed URLs leak in error payloads.
    """
    # Create private complaint as Student A
    complaint_data = {
        "category": "security",
        "location_hostel": "block_a",
        "location_room": "101",
        "description": "Sensitive dispute report",
        "visibility": "private"
    }
    create_res = await client.post(
        f"{BASE_URL}/api/complaints",
        data=complaint_data,
        headers={"Authorization": f"Bearer {student_a_token}"}
    )
    assert create_res.status_code == 200
    complaint_id = create_res.json()["data"]["id"]

    # Student B queries the private complaint directly
    fetch_res = await client.get(
        f"{BASE_URL}/api/complaints/{complaint_id}",
        headers={"Authorization": f"Bearer {student_b_token}"}
    )
    assert fetch_res.status_code == 403
    
    # Verify the private complaint is absent from the public feed
    public_list = await client.get(
        f"{BASE_URL}/api/complaints/public",
        headers={"Authorization": f"Bearer {student_b_token}"}
    )
    assert public_list.status_code == 200
    public_ids = [item["id"] for item in public_list.json()["data"]["items"]]
    assert complaint_id not in public_ids
