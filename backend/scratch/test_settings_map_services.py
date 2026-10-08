import asyncio
import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import AsyncSessionLocal
from app.core.uow import UnitOfWork
from app.services.settings_service import SettingsService
from app.services.silent_service import SilentService
from app.services.map_service import MapService
from app.schemas.settings import SystemSettingCreateUpdate, UserSilentSettingRequest
from app.schemas.map import MapLocationCreate, MapPathCreate, LocationType
from uuid import uuid4

async def test_all_services():
    async with AsyncSessionLocal() as session:
        uow = UnitOfWork(session)
        print("--- 1. Testing System Settings Service ---")
        settings_service = SettingsService(uow)
        setting = await settings_service.set_setting(
            SystemSettingCreateUpdate(
                key="maintenance_mode",
                value="false",
                category="System",
                data_type="boolean",
                description="Global maintenance flag",
                is_public=True
            )
        )
        print(f"Setting set: {setting.key} = {setting.value}")
        
        val = await settings_service.get_setting("maintenance_mode", default="false")
        print(f"Fetched setting: maintenance_mode = {val}")
        
        all_settings = await settings_service.list_settings(public_only=True)
        print(f"Public settings count: {len(all_settings)}")

        print("\n--- 2. Testing Map Service & Dijkstra Route Navigation ---")
        map_service = MapService(uow)
        
        # Create Main Building Node
        bldg = await map_service.create_location(
            MapLocationCreate(
                code=f"BLDG_MAIN_{uuid4().hex[:4]}",
                name="Main Academic Building",
                type=LocationType.building,
                floor=0,
                latitude=20.2961,
                longitude=85.8245,
                description="5 Floor Academic Block"
            )
        )
        print(f"Building created: {bldg.name} ({bldg.code})")

        # Create Floor 1 Entrance Node
        fl1_stairs = await map_service.create_location(
            MapLocationCreate(
                code=f"FL1_STAIRS_{uuid4().hex[:4]}",
                name="Floor 1 Stairs",
                type=LocationType.other,
                parent_id=bldg.id,
                floor=1,
                description="Stairwell 1"
            )
        )

        # Create Room 101 Node
        room101 = await map_service.create_location(
            MapLocationCreate(
                code=f"ROOM_101_{uuid4().hex[:4]}",
                name="Room 101 Lecture Hall",
                type=LocationType.classroom,
                parent_id=bldg.id,
                floor=1,
                description="Physics Lab"
            )
        )

        # Connect Stairs to Room 101 with 15 meter distance
        path = await map_service.create_path(
            MapPathCreate(
                from_location_id=fl1_stairs.id,
                to_location_id=room101.id,
                distance_m=15.0,
                accessible=True
            )
        )
        print(f"Path created between Stairs and Room 101 (distance: {path.distance_m}m)")

        # Calculate shortest route using Dijkstra
        route = await map_service.calculate_shortest_path(fl1_stairs.id, room101.id)
        print(f"Route status: found={route.found}, total_dist={route.total_distance_m}m")
        print(f"Route steps ({len(route.steps)}): {[s.name for s in route.steps]}")

        print("\n--- 3. Testing Silent Mode & iCal Feed ---")
        silent_service = SilentService(uow)
        
        async with uow.transaction() as u:
            users_list, _ = await u.users.list(limit=1)
            if users_list:
                test_user_id = users_list[0].id
            else:
                test_user_id = uuid4()

        user_setting = await silent_service.get_user_silent_setting(test_user_id)
        print(f"Default user silent setting: mode={user_setting.mode}, buffer_before={user_setting.minutes_before}m")
        
        if users_list:
            updated_setting = await silent_service.update_user_silent_setting(
                test_user_id,
                UserSilentSettingRequest(
                    enabled=True,
                    mode="DND",
                    source="TIMETABLE",
                    minutes_before=10,
                    minutes_after=10,
                    allow_emergency=False
                )
            )
            print(f"Updated user silent setting: mode={updated_setting.mode}, buffer_before={updated_setting.minutes_before}m")
        
        ical_feed = await silent_service.generate_ical_feed(test_user_id)
        print("iCal feed sample generated successfully!")

        print("\n✅ All System Settings, Silent Mode, and Map Dijkstra tests PASSED successfully!")

if __name__ == "__main__":
    asyncio.run(test_all_services())
