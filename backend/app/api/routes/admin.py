from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from uuid import UUID
from typing import List, Optional

from app.core.database import get_db
from app.core.uow import UnitOfWork, get_uow
from app.api.deps import require_permission
from app.core.permissions import Perms
from app.core.security import hash_password
from app.models.user import User, UserType, AccountStatus
from app.models.profiles import StudentProfile, FacultyProfile
from app.models.rbac import Role
from app.models.academic import Department, Course
from app.schemas.common import APIResponse
from app.utils.validation import validate_password, validate_upload_file
from app.core.storage import upload_avatar
from app.services.admin_service import AdminService
from app.services.metadata_service import MetadataService
from app.schemas.admin import (
    StudentStatusUpdateRequest, StudentItemResponse, StudentAdminUpdateRequest,
    StudentCreateRequest,
    FacultyCreateRequest, FacultyItemResponse,
    FacultyUpdateRequest, AdminItemResponse,
    DepartmentResponse, DepartmentCreateRequest, DepartmentUpdateRequest,
    OnboardingStatusResponse, OnboardingTask,
    CourseCreateRequest, CourseUpdateRequest, CourseItemResponse,
    SystemSettingResponse, SystemSettingUpdateRequest
)

router = APIRouter()

def get_admin_service(uow: UnitOfWork = Depends(get_uow)) -> AdminService:
    return AdminService(uow)

def get_metadata_service(uow: UnitOfWork = Depends(get_uow)) -> MetadataService:
    return MetadataService(uow)

@router.get(
    "/students", 
    response_model=APIResponse[List[StudentItemResponse]]
)
async def list_students(
    status: Optional[str] = Query(None, description="Filter by account status (pending, active, rejected)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    service: AdminService = Depends(get_admin_service),
    _ = Depends(require_permission(Perms.STUDENT_PROFILE_LIST))
):
    students, _ = await service.list_students(status=status, skip=skip, limit=limit)
    items = []
    for s in students:
        profile = s.student_profile
        course = profile.course if profile else None
        dept = profile.department if profile else None
        
        items.append(StudentItemResponse(
            id=s.id,
            user_id=s.user_id,
            name=s.name,
            email=s.email,
            course_id=course.id if course else None,
            course_name=course.name if course else "Unknown",
            department_id=dept.id if dept else None,
            department_name=dept.name if dept else "Unknown",
            year=profile.year if profile else 0,
            hostel=profile.hostel if profile else None,
            account_status=s.account_status,
            academic_status=profile.academic_status if profile else None,
            status_note=s.status_note
        ))
    return APIResponse(success=True, data=items)

@router.post(
    "/students", 
    response_model=APIResponse[StudentItemResponse],
    status_code=status.HTTP_201_CREATED
)
async def create_student(
    request: StudentCreateRequest,
    service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(require_permission(Perms.STUDENT_PROFILE_CREATE))
):
    try:
        user = await service.create_student(request, current_user)
        # Fetch it again to load relationships (or just use fake response for now)
        return APIResponse(success=True, message="Student created", data=StudentItemResponse(
            id=user.id, user_id=user.user_id, name=user.name, email=user.email,
            course_name="...", department_name="...", year=request.year,
            account_status=user.account_status
        ))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/students/{id}", response_model=APIResponse[StudentItemResponse])
async def get_student(
    id: UUID, 
    db: AsyncSession = Depends(get_db),
    _ = Depends(require_permission(Perms.STUDENT_PROFILE_VIEW))
):
    stmt = select(User).outerjoin(StudentProfile).options(
        selectinload(User.student_profile).selectinload(StudentProfile.course),
        selectinload(User.student_profile).selectinload(StudentProfile.department)
    ).where(User.id == id, User.user_type == UserType.student)
    result = await db.execute(stmt)
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="Student not found")
        
    profile = s.student_profile
    course = profile.course if profile else None
    dept = profile.department if profile else None
    
    return APIResponse(success=True, data=StudentItemResponse(
        id=s.id, user_id=s.user_id, name=s.name, email=s.email,
        course_id=course.id if course else None, course_name=course.name if course else "Unknown",
        department_id=dept.id if dept else None, department_name=dept.name if dept else "Unknown",
        year=profile.year if profile else 0, hostel=profile.hostel if profile else None,
        account_status=s.account_status, academic_status=profile.academic_status if profile else None,
        status_note=s.status_note
    ))

@router.patch("/students/{id}/status")
async def update_student_status(
    id: UUID, 
    req: StudentStatusUpdateRequest,
    service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(require_permission(Perms.STUDENT_PROFILE_EDIT))
):
    try:
        user = await service.update_student_status(id, req, current_user)
        return APIResponse(success=True, message="Status updated successfully", data={"account_status": user.account_status})
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.patch("/students/{id}")
async def update_student_details(
    id: UUID, 
    req: StudentAdminUpdateRequest,
    service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(require_permission(Perms.STUDENT_PROFILE_EDIT))
):
    try:
        user = await service.update_student(id, req, current_user)
        return APIResponse(success=True, message="Student updated successfully")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/faculty")
async def create_faculty(
    request: FacultyCreateRequest,
    service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(require_permission(Perms.STUDENT_PROFILE_CREATE))
):
    try:
        user = await service.create_faculty(request, current_user)
        return APIResponse(success=True, message="Faculty created successfully", data={"id": str(user.id)})
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/faculty", response_model=APIResponse[List[FacultyItemResponse]])
async def list_faculty(
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    service: AdminService = Depends(get_admin_service),
    _ = Depends(require_permission(Perms.FACULTY_PROFILE_LIST))
):
    faculty, _ = await service.list_faculty(status=status, skip=skip, limit=limit)
    items = []
    for f in faculty:
        profile = f.faculty_profile
        course = profile.course if profile else None
        dept = profile.department if profile else None
        items.append(FacultyItemResponse(
            id=f.id, user_id=f.user_id, name=f.name, email=f.email, photo_url=f.photo_url,
            course_id=course.id if course else None, course_name=course.name if course else "Unknown",
            department_id=dept.id if dept else None, department_name=dept.name if dept else "Unknown",
            designation=profile.designation if profile else "Unknown", is_hod=False,
            account_status=f.account_status, employment_status=profile.employment_status if profile else None,
            status_note=f.status_note
        ))
    return APIResponse(success=True, data=items)

@router.put("/users/{user_id}/photo")
async def admin_upload_user_photo(
    user_id: UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _ = Depends(require_permission(Perms.STUDENT_PROFILE_EDIT))
):
    from app.core.config import settings
    await validate_upload_file(file, max_size_mb=settings.MAX_UPLOAD_FILE_SIZE_MB, allowed_types=["image/jpeg", "image/png", "image/webp"])
    user = await db.get(User, user_id)
    if not user: raise HTTPException(404, "User not found")
    url = await upload_avatar(file, user.id)
    user.photo_url = url
    await db.commit()
    return APIResponse(success=True, message="Photo uploaded", data={"photo_url": url})

@router.get("/admins", response_model=APIResponse[List[AdminItemResponse]])
async def list_admins(db: AsyncSession = Depends(get_db), _ = Depends(require_permission(Perms.STUDENT_PROFILE_LIST))):
    stmt = select(User).where(User.user_type == UserType.admin)
    result = await db.execute(stmt)
    admins = result.scalars().all()
    return APIResponse(success=True, data=[AdminItemResponse.model_validate(a) for a in admins])

@router.get("/settings", response_model=APIResponse[List[SystemSettingResponse]])
async def get_system_settings(service: MetadataService = Depends(get_metadata_service), _ = Depends(require_permission(Perms.SYSTEM_SETTING_MANAGE))):
    settings = await service.list_settings()
    return APIResponse(success=True, data=[SystemSettingResponse.model_validate(s) for s in settings])

@router.patch("/settings/{key}")
async def update_system_setting(
    key: str, 
    request: SystemSettingUpdateRequest,
    service: MetadataService = Depends(get_metadata_service),
    _ = Depends(require_permission(Perms.SYSTEM_SETTING_MANAGE))
):
    try:
        setting = await service.update_setting(key, request)
        return APIResponse(success=True, message="Setting updated", data=SystemSettingResponse.model_validate(setting))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/departments", response_model=APIResponse[List[DepartmentResponse]])
async def list_departments(service: MetadataService = Depends(get_metadata_service), _ = Depends(require_permission(Perms.DEPARTMENT_MANAGE))):
    depts = await service.list_departments()
    return APIResponse(success=True, data=[DepartmentResponse.model_validate(d) for d in depts])

@router.post("/departments", response_model=APIResponse[DepartmentResponse])
async def create_department(req: DepartmentCreateRequest, service: MetadataService = Depends(get_metadata_service), _ = Depends(require_permission(Perms.DEPARTMENT_MANAGE))):
    try:
        dept = await service.create_department(req)
        return APIResponse(success=True, data=DepartmentResponse.model_validate(dept))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.patch("/departments/{id}")
async def update_department(id: UUID, req: DepartmentUpdateRequest, service: MetadataService = Depends(get_metadata_service), _ = Depends(require_permission(Perms.DEPARTMENT_MANAGE))):
    try:
        dept = await service.update_department(str(id), req)
        return APIResponse(success=True, data=DepartmentResponse.model_validate(dept))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.delete("/departments/{id}")
async def delete_department(id: UUID, service: MetadataService = Depends(get_metadata_service), _ = Depends(require_permission(Perms.DEPARTMENT_MANAGE))):
    try:
        await service.delete_department(str(id))
        return APIResponse(success=True, message="Deleted successfully")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/courses", response_model=APIResponse[List[CourseItemResponse]])
async def list_courses(service: MetadataService = Depends(get_metadata_service), _ = Depends(require_permission(Perms.DEPARTMENT_MANAGE))):
    courses = await service.list_courses()
    return APIResponse(success=True, data=[CourseItemResponse.model_validate(c) for c in courses])

@router.post("/courses", response_model=APIResponse[CourseItemResponse])
async def create_course(req: CourseCreateRequest, service: MetadataService = Depends(get_metadata_service), _ = Depends(require_permission(Perms.DEPARTMENT_MANAGE))):
    try:
        course = await service.create_course(req)
        return APIResponse(success=True, data=CourseItemResponse.model_validate(course))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.patch("/courses/{id}")
async def update_course(id: UUID, req: CourseUpdateRequest, service: MetadataService = Depends(get_metadata_service), _ = Depends(require_permission(Perms.DEPARTMENT_MANAGE))):
    try:
        course = await service.update_course(str(id), req)
        return APIResponse(success=True, data=CourseItemResponse.model_validate(course))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.delete("/courses/{id}")
async def delete_course(id: UUID, service: MetadataService = Depends(get_metadata_service), _ = Depends(require_permission(Perms.DEPARTMENT_MANAGE))):
    try:
        await service.delete_course(str(id))
        return APIResponse(success=True, message="Deleted successfully")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/onboarding-status")
async def get_onboarding_status(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(func.count(User.id)))
    has_users = res.scalar() > 1
    res = await db.execute(select(func.count(Role.id)))
    has_roles = res.scalar() > 2
    res = await db.execute(select(func.count(Department.id)))
    has_depts = res.scalar() > 0
    res = await db.execute(select(func.count(Course.id)))
    has_courses = res.scalar() > 0
    
    tasks = [
        OnboardingTask(id="users", title="Create Users", description="Add first users", is_completed=has_users, action_url="/admin/users/create"),
        OnboardingTask(id="roles", title="Configure Roles", description="Set up RBAC", is_completed=has_roles, action_url="/admin/roles"),
        OnboardingTask(id="depts", title="Departments", description="Add departments", is_completed=has_depts, action_url="/admin/departments"),
        OnboardingTask(id="courses", title="Courses", description="Add courses", is_completed=has_courses, action_url="/admin/courses"),
    ]
    completed = sum(1 for t in tasks if t.is_completed)
    percentage = int((completed / len(tasks)) * 100)
    
    return APIResponse(success=True, data=OnboardingStatusResponse(completion_percentage=percentage, tasks=tasks))
