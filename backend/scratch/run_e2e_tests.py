import asyncio
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

async def run_all_e2e_tests():
    print("=================================================================")
    print("🚀 BPUT CMS BACKEND END-TO-END USER JOURNEY TEST SUITE")
    print("=================================================================\n")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Setup Admin and Student Token Headers
        async with AsyncSessionLocal() as session:
            uow = UnitOfWork(session)
            async with uow.transaction() as u:
                admin_users, _ = await u.users.list(filters={"user_type": UserType.admin}, limit=1)
                admin_id = admin_users[0].id if admin_users else (await u.users.create(User(
                    email=f"admin_{uuid4().hex[:4]}@cms.com",
                    hashed_password="pw",
                    name="Admin User",
                    user_type=UserType.admin
                ))).id

                student_users, _ = await u.users.list(filters={"user_type": UserType.student}, limit=1)
                student_id = student_users[0].id if student_users else (await u.users.create(User(
                    email=f"student_{uuid4().hex[:4]}@cms.com",
                    hashed_password="pw",
                    name="Student User",
                    user_type=UserType.student
                ))).id

        admin_token = create_access_token(subject=str(admin_id))
        student_token = create_access_token(subject=str(student_id))

        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        student_headers = {"Authorization": f"Bearer {student_token}"}

        # TEST 1: Public Health & Metadata
        print("🔹 Test 1: Public Health & Metadata Lookups...")
        r_health = await client.get("/health")
        assert r_health.status_code == 200, f"Health check failed: {r_health.text}"
        
        r_meta = await client.get("/api/metadata/departments")
        assert r_meta.status_code == 200, f"Metadata lookup failed: {r_meta.text}"

        r_pub_settings = await client.get("/api/settings/public")
        assert r_pub_settings.status_code == 200
        print("   ✅ PASSED: Health, Metadata, and Public Settings working.\n")

        # TEST 2: User Silent Settings & iCal Feed Export
        print("🔹 Test 2: User Silent Settings & iCal Feed Export...")
        r_silent_get = await client.get("/api/silent/settings", headers=student_headers)
        assert r_silent_get.status_code == 200

        r_silent_put = await client.put(
            "/api/silent/settings",
            headers=student_headers,
            json={
                "enabled": True,
                "mode": "DND",
                "source": "TIMETABLE",
                "minutes_before": 10,
                "minutes_after": 10,
                "allow_emergency": False
            }
        )
        assert r_silent_put.status_code == 200
        assert r_silent_put.json()["data"]["mode"].lower() == "dnd"

        r_sched = await client.get("/api/silent/schedule", headers=student_headers)
        assert r_sched.status_code == 200

        r_ical = await client.get("/api/silent/ical.ics", headers=student_headers)
        assert r_ical.status_code == 200
        assert "BEGIN:VCALENDAR" in r_ical.text
        print("   ✅ PASSED: Silent Mode Preferences, Schedule & iCal .ics Feed export working.\n")

        # TEST 3: Campus Map Locations & Dijkstra Navigation Route
        print("🔹 Test 3: Multi-Floor Campus Map & Dijkstra Route Navigation...")
        tag = uuid4().hex[:4]

        # Building Node
        r_bldg = await client.post(
            "/api/map/locations",
            headers=admin_headers,
            json={
                "code": f"BLDG_EC_{tag}",
                "name": "Electronics & Telecom Block",
                "type": "BUILDING",
                "floor": 0,
                "description": "5 Floor Academic Block"
            }
        )
        assert r_bldg.status_code == 200
        bldg_id = r_bldg.json()["data"]["id"]

        # Stairs Node
        r_stairs = await client.post(
            "/api/map/locations",
            headers=admin_headers,
            json={
                "code": f"FL1_STAIRS_{tag}",
                "name": "Floor 1 Central Stairwell",
                "type": "OTHER",
                "parent_id": bldg_id,
                "floor": 1
            }
        )
        assert r_stairs.status_code == 200
        stairs_id = r_stairs.json()["data"]["id"]

        # Room Node
        r_room = await client.post(
            "/api/map/locations",
            headers=admin_headers,
            json={
                "code": f"ROOM_102_{tag}",
                "name": "Room 102 Signal Processing Lab",
                "type": "LAB",
                "parent_id": bldg_id,
                "floor": 1
            }
        )
        assert r_room.status_code == 200
        room_id = r_room.json()["data"]["id"]

        # Path Edge (18.5 meters)
        r_path = await client.post(
            "/api/map/paths",
            headers=admin_headers,
            json={
                "from_location_id": stairs_id,
                "to_location_id": room_id,
                "distance_m": 18.5,
                "accessible": True
            }
        )
        assert r_path.status_code == 200

        # Calculate Dijkstra Route
        r_route = await client.get(f"/api/map/route?from_location_id={stairs_id}&to_location_id={room_id}")
        assert r_route.status_code == 200
        assert r_route.json()["data"]["found"] is True
        assert r_route.json()["data"]["total_distance_m"] == 18.5
        assert len(r_route.json()["data"]["steps"]) == 2
        print(f"   ✅ PASSED: Campus Map Location Tree, Path Edges & Dijkstra Navigation (Route: {r_route.json()['data']['steps'][0]['name']} -> {r_route.json()['data']['steps'][1]['name']}, Dist: 18.5m).\n")

        # TEST 4: Campus AI Assistant Query & Context Trajectory
        print("🔹 Test 4: BPUT Campus AI Assistant Chat & Context Query...")
        r_conv = await client.post(
            "/api/ai/conversations",
            headers=student_headers,
            json={"title": "Exam Hall Walking Directions Query"}
        )
        assert r_conv.status_code == 200
        conv_id = r_conv.json()["data"]["id"]

        r_msg = await client.post(
            f"/api/ai/conversations/{conv_id}/messages",
            headers=student_headers,
            json={"content": "Where is Room 102 Signal Processing Lab and how do I navigate there?"}
        )
        assert r_msg.status_code == 200
        assert r_msg.json()["data"]["role"] == "assistant"

        r_hist = await client.get(
            f"/api/ai/conversations/{conv_id}/messages",
            headers=student_headers
        )
        assert r_hist.status_code == 200
        assert len(r_hist.json()["data"]["items"]) >= 3
        print(f"   ✅ PASSED: AI Assistant Chat Session, Contextual Response & History Trajectory working.\n")

    print("=================================================================")
    print("🎉 ALL END-TO-END INTEGRATION TEST SCENARIOS PASSED 100% CLEANLY!")
    print("=================================================================")

if __name__ == "__main__":
    asyncio.run(run_all_e2e_tests())
