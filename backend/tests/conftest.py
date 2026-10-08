import pytest
import pytest_asyncio
import sys
import os
from httpx import AsyncClient, ASGITransport
from uuid import uuid4

# Add backend root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.core.database import AsyncSessionLocal
from app.core.uow import UnitOfWork
from app.core.security import create_access_token
from app.models.user import User, UserType

@pytest_asyncio.fixture
async def async_client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

@pytest_asyncio.fixture
async def admin_headers():
    async with AsyncSessionLocal() as session:
        uow = UnitOfWork(session)
        async with uow.transaction() as u:
            users, _ = await u.users.list(filters={"user_type": UserType.admin}, limit=1)
            if users:
                user_id = users[0].id
            else:
                admin = User(
                    email=f"admin_{uuid4().hex[:4]}@cms.com",
                    hashed_password="hashed_password",
                    name="System Admin",
                    user_type=UserType.admin
                )
                created = await u.users.create(admin)
                user_id = created.id
        token = create_access_token(subject=str(user_id))
        return {"Authorization": f"Bearer {token}"}

@pytest_asyncio.fixture
async def student_headers():
    async with AsyncSessionLocal() as session:
        uow = UnitOfWork(session)
        async with uow.transaction() as u:
            users, _ = await u.users.list(filters={"user_type": UserType.student}, limit=1)
            if users:
                user_id = users[0].id
            else:
                student = User(
                    email=f"student_{uuid4().hex[:4]}@cms.com",
                    hashed_password="hashed_password",
                    name="Test Student",
                    user_type=UserType.student
                )
                created = await u.users.create(student)
                user_id = created.id
        token = create_access_token(subject=str(user_id))
        return {"Authorization": f"Bearer {token}"}
