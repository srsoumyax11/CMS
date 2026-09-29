from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.academic import Course
from app.schemas.common import APIResponse

from app.models.settings import SystemSetting

router = APIRouter()

@router.get(
    "/settings/public",
    summary="Get Public System Settings",
    description="Returns all system settings that are marked as public (e.g., password rules, site name).",
    response_model=APIResponse
)
async def get_public_settings(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SystemSetting).where(SystemSetting.is_public == True))
    settings = result.scalars().all()
    
    data = {s.key: s.value for s in settings}
    return APIResponse(success=True, data=data, error=None)

from app.models.academic import Course, Department

@router.get(
    "/courses", 
    summary="Get Courses Metadata", 
    description="Returns a list of all active courses.",
    response_model=APIResponse
)
async def get_courses(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Course).where(Course.is_active == True)
    )
    courses = result.scalars().all()
    
    data = [{"id": str(course.id), "name": course.name} for course in courses]
    return APIResponse(success=True, data=data, error=None)

@router.get(
    "/departments", 
    summary="Get Departments Metadata", 
    description="Returns a list of all active departments.",
    response_model=APIResponse
)
async def get_departments(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Department).where(Department.is_active == True)
    )
    departments = result.scalars().all()
    
    data = [{"id": str(d.id), "name": d.name, "code": d.code, "department_type": d.department_type} for d in departments]
    return APIResponse(success=True, data=data, error=None)

@router.get(
    "/hierarchy",
    summary="Get Faculty Hierarchy Tree",
    description="Returns the nested folder structure of Courses -> Departments -> Faculty.",
    response_model=APIResponse
)
async def get_hierarchy(db: AsyncSession = Depends(get_db)):
    from app.models.profiles import FacultyProfile, EmploymentStatus
    
    courses_res = await db.execute(select(Course).where(Course.is_active == True))
    depts_res = await db.execute(select(Department).where(Department.is_active == True))
    faculty_res = await db.execute(
        select(FacultyProfile)
        .options(selectinload(FacultyProfile.user))
        .where(FacultyProfile.employment_status == EmploymentStatus.active)
    )
    
    courses = {c.id: c for c in courses_res.scalars().all()}
    depts = {d.id: d for d in depts_res.scalars().all()}
    faculties = faculty_res.scalars().all()
    
    tree = {}
    for f in faculties:
        c_id = f.course_id
        d_id = f.department_id
        
        if c_id not in courses or d_id not in depts:
            continue
            
        if c_id not in tree:
            tree[c_id] = {
                "course_id": str(c_id),
                "course_name": courses[c_id].name,
                "departments": {}
            }
            
        if d_id not in tree[c_id]["departments"]:
            dept_obj = depts[d_id]
            tree[c_id]["departments"][d_id] = {
                "department_id": str(d_id),
                "department_name": dept_obj.name,
                "hod_user_id": str(dept_obj.hod_user_id) if dept_obj.hod_user_id else None,
                "faculty": []
            }
            
        user = f.user
        dept_obj = depts[d_id]
        tree[c_id]["departments"][d_id]["faculty"].append({
            "id": str(f.user_id),
            "name": user.name if user else "Unknown",
            "designation": f.designation,
            "is_hod": (dept_obj.hod_user_id == f.user_id)
        })
        
    # Convert dicts to lists
    result_data = []
    for c_id, c_data in tree.items():
        c_data["departments"] = list(c_data["departments"].values())
        result_data.append(c_data)
        
    return APIResponse(success=True, data=result_data, error=None)
