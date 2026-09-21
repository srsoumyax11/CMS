import httpx
import asyncio
import uuid
import sys
import os

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.core.security import create_access_token

async def test():
    # create dummy token
    token = create_access_token(subject=str(uuid.uuid4()))
    async with httpx.AsyncClient() as client:
        res = await client.get('http://127.0.0.1:8000/api/auth/me', headers={'Authorization': f'Bearer {token}'})
        print(f"Status: {res.status_code}")
        print(f"Body: {res.text}")

if __name__ == "__main__":
    asyncio.run(test())
