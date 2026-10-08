import pytest
from uuid import uuid4

@pytest.mark.asyncio
async def test_01_public_health_and_metadata(async_client):
    """Verify health status, system metadata lookups, and unauthenticated public settings."""
    # 1. Health check
    res_health = await async_client.get("/health")
    assert res_health.status_code == 200
    assert res_health.json()["success"] is True

    # 2. Metadata departments lookup
    res_meta = await async_client.get("/api/metadata/departments")
    assert res_meta.status_code == 200
    assert res_meta.json()["success"] is True

    # 3. Public system settings
    res_settings = await async_client.get("/api/settings/public")
    assert res_settings.status_code == 200
    assert res_settings.json()["success"] is True

@pytest.mark.asyncio
async def test_02_silent_mode_and_ical_feed(async_client, student_headers):
    """Verify user silent preferences, daily schedule calculation, and iCal .ics feed export."""
    # 1. Get Silent Settings
    res_get = await async_client.get("/api/silent/settings", headers=student_headers)
    assert res_get.status_code == 200
    assert res_get.json()["success"] is True

    # 2. Update Silent Settings (DND, 10 min buffers)
    res_put = await async_client.put(
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
    assert res_put.status_code == 200
    assert res_put.json()["data"]["mode"].lower() == "dnd"

    # 3. Daily Silent Schedule Calculation
    res_sched = await async_client.get("/api/silent/schedule", headers=student_headers)
    assert res_sched.status_code == 200
    assert "items" in res_sched.json()["data"]

    # 4. Download iCal Calendar Feed
    res_ical = await async_client.get("/api/silent/ical.ics", headers=student_headers)
    assert res_ical.status_code == 200
    assert "BEGIN:VCALENDAR" in res_ical.text
    assert "END:VCALENDAR" in res_ical.text

@pytest.mark.asyncio
async def test_03_campus_map_and_dijkstra_routing(async_client, admin_headers):
    """Verify campus map location node creation, path edge linking, and Dijkstra route calculation."""
    unique_tag = uuid4().hex[:4]

    # 1. Create Building Node
    res_bldg = await async_client.post(
        "/api/map/locations",
        headers=admin_headers,
        json={
            "code": f"BLDG_CSE_{unique_tag}",
            "name": "CSE Academic Block",
            "type": "BUILDING",
            "floor": 0,
            "description": "Computer Science Department"
        }
    )
    assert res_bldg.status_code == 200
    bldg_id = res_bldg.json()["data"]["id"]

    # 2. Create Room 1 Node
    res_r1 = await async_client.post(
        "/api/map/locations",
        headers=admin_headers,
        json={
            "code": f"ROOM_LAB1_{unique_tag}",
            "name": "AI Systems Lab",
            "type": "LAB",
            "parent_id": bldg_id,
            "floor": 1
        }
    )
    assert res_r1.status_code == 200
    r1_id = res_r1.json()["data"]["id"]

    # 3. Create Room 2 Node
    res_r2 = await async_client.post(
        "/api/map/locations",
        headers=admin_headers,
        json={
            "code": f"ROOM_LAB2_{unique_tag}",
            "name": "Robotics Lab",
            "type": "LAB",
            "parent_id": bldg_id,
            "floor": 1
        }
    )
    assert res_r2.status_code == 200
    r2_id = res_r2.json()["data"]["id"]

    # 4. Create Path Edge between Lab 1 and Lab 2
    res_path = await async_client.post(
        "/api/map/paths",
        headers=admin_headers,
        json={
            "from_location_id": r1_id,
            "to_location_id": r2_id,
            "distance_m": 25.5,
            "accessible": True
        }
    )
    assert res_path.status_code == 200

    # 5. Calculate Dijkstra Shortest Walking Path
    res_route = await async_client.get(
        f"/api/map/route?from_location_id={r1_id}&to_location_id={r2_id}"
    )
    assert res_route.status_code == 200
    assert res_route.json()["data"]["found"] is True
    assert res_route.json()["data"]["total_distance_m"] == 25.5
    assert len(res_route.json()["data"]["steps"]) == 2

@pytest.mark.asyncio
async def test_04_ai_assistant_chat_flow(async_client, student_headers):
    """Verify AI conversation creation, query submission, and chat history retrieval."""
    # 1. Create AI Conversation
    res_conv = await async_client.post(
        "/api/ai/conversations",
        headers=student_headers,
        json={"title": "Campus Navigation Inquiry"}
    )
    assert res_conv.status_code == 200
    conv_id = res_conv.json()["data"]["id"]

    # 2. List Conversations
    res_list = await async_client.get("/api/ai/conversations", headers=student_headers)
    assert res_list.status_code == 200
    assert res_list.json()["data"]["total"] >= 1

    # 3. Send User Message to AI
    res_msg = await async_client.post(
        f"/api/ai/conversations/{conv_id}/messages",
        headers=student_headers,
        json={"content": "How do I navigate to the Robotics Lab?"}
    )
    assert res_msg.status_code == 200
    assert res_msg.json()["data"]["role"] == "assistant"
    assert "Navigation" in res_msg.json()["data"]["content"] or "Lab" in res_msg.json()["data"]["content"]

    # 4. Retrieve Conversation History
    res_hist = await async_client.get(
        f"/api/ai/conversations/{conv_id}/messages",
        headers=student_headers
    )
    assert res_hist.status_code == 200
    assert len(res_hist.json()["data"]["items"]) >= 3
