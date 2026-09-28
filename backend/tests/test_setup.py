import sys
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from .config import print_step
from .state import state

def run_setup():
    print_step("0. Fetching DB Reference Data (Courses/Branches)")
    try:
        async def fetch_ids():
            engine = create_async_engine("postgresql+asyncpg://postgres:postgres@localhost:54322/postgres")
            async with engine.connect() as conn:
                res = await conn.execute(text("SELECT id FROM courses LIMIT 1"))
                c_id = res.scalar()
                if not c_id:
                    print("No courses found. Did you run scripts/setup.py?")
                    sys.exit(1)
                
                res = await conn.execute(text("SELECT id FROM branches LIMIT 1"))
                b_id = res.scalar()
                
                res = await conn.execute(text("SELECT id FROM departments LIMIT 1"))
                d_id = res.scalar()
                
                return str(c_id), str(b_id), str(d_id)
                
        course_id, branch_id, dept_id = asyncio.run(fetch_ids())
        print(f"Found Course: {course_id} | Branch: {branch_id} | Dept: {dept_id}")
        
        state["course_id"] = course_id
        state["branch_id"] = branch_id
        state["department_id"] = dept_id
        
    except Exception as e:
        print(f"Failed to connect to database for setup data: {e}")
        sys.exit(1)
