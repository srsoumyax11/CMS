import asyncio
from app.main import app
from fastapi.testclient import TestClient
from app.core.database import get_db
from sqlalchemy import select
from app.models.user import User

client = TestClient(app, raise_server_exceptions=True)

# Register a student
res = client.post("/api/auth/register", json={
    "email": "testclient@example.com",
    "password": "securepassword",
    "name": "Test Client",
    "user_id": "STUTEST",
    "course_id": "13408608-0072-4669-bc98-87013c5252b0",
    "branch_id": "f20000aa-e484-49a6-86c9-b6734dd0c361",
    "year": 2024,
    "hostel": "A"
})
if res.status_code != 200:
    print("Register failed:", res.text)
else:
    token = res.json()["data"]["access_token"]
    res = client.get("/api/notices", headers={"Authorization": f"Bearer {token}"})
    print(res.status_code, res.text)
