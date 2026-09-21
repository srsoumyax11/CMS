import httpx
import asyncio
import sys
import os

async def test():
    async with httpx.AsyncClient() as client:
        # Register a new student
        reg_data = {
            "email": "test500@test.com",
            "password": "SecurePassword123!",
            "name": "Test 500",
            "user_id": "TEST_500"
        }
        res = await client.post('http://127.0.0.1:8000/api/auth/register', json=reg_data)
        print(f"Register status: {res.status_code}")
        if res.status_code != 200:
            print(res.text)
            return

        token = res.json()["data"]["access_token"]
        
        # Test /api/auth/me
        res = await client.get('http://127.0.0.1:8000/api/auth/me', headers={'Authorization': f'Bearer {token}'})
        print(f"/api/auth/me Status: {res.status_code}")
        print(f"/api/auth/me Body: {res.text}")

if __name__ == "__main__":
    asyncio.run(test())
