import httpx
import asyncio

async def test():
    async with httpx.AsyncClient() as client:
        # We need an admin token to test this, or we can just check if the endpoint exists and returns 401
        res = await client.get('http://127.0.0.1:8000/api/admin/departments')
        print(f"Status: {res.status_code}")
        print(f"Body: {res.text}")

if __name__ == "__main__":
    asyncio.run(test())
