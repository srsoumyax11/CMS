import pytest
import pytest_asyncio
import httpx
import uuid
from typing import AsyncGenerator

BASE_URL = "http://localhost:8000"

@pytest_asyncio.fixture
async def client() -> AsyncGenerator[httpx.AsyncClient, None]:
    async with httpx.AsyncClient() as ac:
        yield ac

async def create_and_approve_student(client: httpx.AsyncClient, email: str, name: str) -> str:
    # Get course and department
    metadata_res = await client.get(f"{BASE_URL}/api/metadata/courses")
    courses = metadata_res.json()["data"]
    if not courses:
        pytest.fail("No courses found in database. Run seed script first.")
    
    dept_res = await client.get(f"{BASE_URL}/api/metadata/departments")
    departments = dept_res.json()["data"]
    if not departments:
        pytest.fail("No departments found in database.")
    
    course_id = courses[0]["id"]
    department_id = departments[0]["id"]

    # Register student
    reg_data = {
        "email": email,
        "password": "SecurePassword123!",
        "name": name,
        "user_id": f"STU_{uuid.uuid4().hex[:8].upper()}",
        "phone": "1234567890",
        "course_id": course_id,
        "department_id": department_id,
        "year": 2024,
        "hostel": "block_a"
    }
    
    reg_res = await client.post(f"{BASE_URL}/api/auth/register", json=reg_data)
    assert reg_res.status_code == 200, f"Registration failed: {reg_res.text}"

    import sys
    import os
    sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
    from app.core.config import settings
    
    admin_login = {
        "email": settings.SUPERADMIN_EMAIL,
        "password": settings.SUPERADMIN_PASSWORD
    }
    admin_res = await client.post(f"{BASE_URL}/api/auth/login", json=admin_login)
    assert admin_res.status_code == 200, f"Admin login failed: {admin_res.text}"
    admin_token = admin_res.json()["data"]["access_token"]
    
    # Get pending students and approve this one
    pending_res = await client.get(
        f"{BASE_URL}/api/admin/students?status=pending",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    pending_students = pending_res.json()["data"]
    student_profile_id = next((s["id"] for s in pending_students if s["email"] == email), None)
    
    if student_profile_id:
        approve_res = await client.patch(
            f"{BASE_URL}/api/admin/students/{student_profile_id}/status",
            json={"account_status": "active"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert approve_res.status_code == 200, f"Approval failed: {approve_res.text}"
    else:
        pytest.fail(f"Student {email} not found in pending students list. Pending list: {pending_students}")
        
    # Login as the student
    login_data = {
        "email": email,
        "password": "SecurePassword123!"
    }
    login_res = await client.post(f"{BASE_URL}/api/auth/login", json=login_data)
    assert login_res.status_code == 200, f"Student login failed: {login_res.text}"
    return login_res.json()["data"]["access_token"]

@pytest_asyncio.fixture
async def student_a_token(client: httpx.AsyncClient) -> str:
    unique = str(uuid.uuid4())[:8]
    return await create_and_approve_student(client, f"student_a_{unique}@test.com", "Student A")

@pytest_asyncio.fixture
async def student_b_token(client: httpx.AsyncClient) -> str:
    unique = str(uuid.uuid4())[:8]
    return await create_and_approve_student(client, f"student_b_{unique}@test.com", "Student B")
