from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.academic import Course
from app.schemas.common import APIResponse

router = APIRouter()

@router.get("/courses", response_model=APIResponse)
async def get_courses(db: AsyncSession = Depends(get_db)):
    """
    Returns a list of all active courses and their active branches.
    Used by the frontend to populate registration dropdowns.
    """
    result = await db.execute(
        select(Course)
        .options(selectinload(Course.branches))
        .where(Course.is_active == True)
    )
    courses = result.scalars().all()
    
    # Format the data for the frontend
    data = []
    for course in courses:
        branches = [{"id": str(b.id), "name": b.name} for b in course.branches if b.is_active]
        data.append({
            "id": str(course.id),
            "name": course.name,
            "branches": branches
        })
        
    return APIResponse(success=True, data=data, error=None)
