import sys
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from .config import print_step
from .state import state

def run_setup():
    print_step("0. Fetching DB Reference Data (Courses/Departments)")
    try:
        async def fetch_ids():
            engine = create_async_engine("postgresql+asyncpg://postgres:postgres@localhost:54322/postgres")
            async with engine.connect() as conn:
                res = await conn.execute(text("SELECT id FROM courses LIMIT 1"))
                c_id = res.scalar()
                if not c_id:
                    print("No courses found. Did you run scripts/setup.py?")
                    sys.exit(1)
                
                res = await conn.execute(text("SELECT id FROM departments LIMIT 1"))
                d_id = res.scalar()
                
                res = await conn.execute(text("SELECT rooms.id, buildings.name FROM rooms JOIN buildings ON rooms.building_id = buildings.id LIMIT 1"))
                room_row = res.first()
                
                # Disable 2FA for superadmin so tests can run without mailpit
                await conn.execute(text("UPDATE users SET is_2fa_enabled = false WHERE email = 'superadmin@cms.com'"))
                await conn.commit()
                
                r_id = str(room_row[0]) if room_row else None
                b_name = str(room_row[1]) if room_row else "Kalam Boys Hostel"
                
                return str(c_id), str(d_id), r_id, b_name
                
        course_id, dept_id, room_id, building_name = asyncio.run(fetch_ids())
        print(f"Found Course: {course_id} | Dept: {dept_id} | Room: {room_id} | Building: {building_name}")
        
        state["course_id"] = course_id
        state["department_id"] = dept_id
        state["room_id"] = room_id
        state["building_name"] = building_name
        
    except Exception as e:
        print(f"Failed to connect to database for setup data: {e}")
        sys.exit(1)
