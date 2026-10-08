from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from uuid import UUID
from typing import List, Optional

from app.core.database import get_db
from app.core.uow import UnitOfWork, get_uow
from app.api.deps import require_permission, require_admin, get_department_scope
from app.core.permissions import Perms
from app.core.security import hash_password
from app.models.user import User, UserType, AccountStatus
from app.models.profiles import StudentProfile, FacultyProfile, StaffProfile
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
    FacultyUpdateRequest, FacultyStatusUpdateRequest, AdminItemResponse,
    DepartmentResponse, DepartmentCreateRequest, DepartmentUpdateRequest,
    OnboardingStatusResponse, OnboardingTask,
    CourseCreateRequest, CourseUpdateRequest, CourseItemResponse,
    SystemSettingResponse, SystemSettingUpdateRequest,
    UserManagementItemResponse, UserManagementUpdateRequest
)
from app.schemas.staff import (
    StaffCreateRequest,
    StaffUpdateRequest,
    StaffStatusUpdateRequest,
    StaffItemResponse
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
    department_id: Optional[UUID] = Query(None, description="Filter by department"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    scope_dept_id: Optional[UUID] = Depends(get_department_scope),
    service: AdminService = Depends(get_admin_service),
    _ = Depends(require_permission(Perms.STUDENT_PROFILE_LIST))
):
    effective_dept_id = scope_dept_id if scope_dept_id is not None else department_id
    students, _ = await service.list_students(status=status, department_id=effective_dept_id, skip=skip, limit=limit)
    items = []
    for s in students:
        profile = s.student_profile
        course = profile.course if profile else None
        dept = profile.department if profile else None
        hostel_bldg = getattr(profile, "room").building.name if profile and getattr(profile, "room", None) and getattr(profile, "room").building else None
        
        items.append(StudentItemResponse(
            id=s.id,
            user_id=str(s.id),
            registration_no=profile.registration_no if profile else "",
            roll_no=profile.roll_no if profile else None,
            name=s.name or s.email.split('@')[0],
            email=s.email,
            course_id=course.id if course else None,
            course_name=str(course.name) if course else "Unknown",
            department_id=dept.id if dept else None,
            department_name=str(dept.name) if dept else "Unknown",
            admission_year=profile.admission_year if profile else 2024,
            current_semester=profile.current_semester if profile else 1,
            section=profile.section if profile else "A",
            year=profile.year if profile else 0,
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
        return APIResponse(success=True, message="Student created", data=StudentItemResponse(
            id=user.id, user_id=str(user.id), registration_no=request.registration_no, roll_no=request.roll_no,
            name=user.name or user.email.split('@')[0], email=user.email,
            course_name="...", department_name="...", admission_year=request.admission_year,
            current_semester=request.current_semester, section=request.section, year=request.year,
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
        id=s.id, user_id=str(s.id), registration_no=profile.registration_no if profile else "",
name=s.name or s.email.split('@')[0], email=s.email,
        course_id=course.id if course else None, course_name=str(course.name) if course else "Unknown",
        department_id=dept.id if dept else None, department_name=str(dept.name) if dept else "Unknown",
        admission_year=profile.admission_year if profile else 2024, current_semester=profile.current_semester if profile else 1,
        section=profile.section if profile else "A", year=profile.year if profile else 0,
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


def map_faculty_response(f: User) -> FacultyItemResponse:
    profile = f.faculty_profile
    dept = profile.department if profile else None
    
    staff_code = f"FAC-2026-{str(f.id).split('-')[0].upper()}"

    return FacultyItemResponse(
        id=f.id,
        user_id=staff_code,
        name=f.name or f.email.split('@')[0],
        email=f.email,
        photo_url=f.photo_url,
        department_id=dept.id if dept else UUID('00000000-0000-0000-0000-000000000000'),
        department_name=str(dept.name) if dept else "Unknown",
        designation=profile.designation if profile else "Unknown",
        is_hod=False,
        account_status=f.account_status,
        employment_status=profile.employment_status if profile else None,
        status_note=f.status_note
    )

def map_staff_response(user: User) -> StaffItemResponse:
    profile = user.staff_profile
    dept = profile.department if profile else None
    role = user.role
    return StaffItemResponse(
        id=user.id,
        user_id=str(user.id),
        name=user.name or user.email.split('@')[0],
        email=user.email,
        photo_url=user.photo_url,
        department_id=dept.id if dept else None,
        department_name=str(dept.name) if dept else None,
        designation=profile.designation if profile else "Unknown",
        role_id=role.id if role else user.role_id,
        role_name=role.name if role else None,
        account_status=user.account_status,
        employment_status=profile.employment_status if profile else None,
        status_note=user.status_note,
        created_at=user.created_at
    )

@router.post(
    "/faculty", 
    response_model=APIResponse[FacultyItemResponse]
)
async def create_faculty(
    request: FacultyCreateRequest,
    service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(require_permission(Perms.FACULTY_PROFILE_CREATE))
):
    try:
        user = await service.create_faculty(request, current_user)
        f = await service.get_faculty(user.id)
        return APIResponse(success=True, message="Faculty created successfully", data=map_faculty_response(f))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/faculty", response_model=APIResponse[List[FacultyItemResponse]])
async def list_faculty(
    status: Optional[str] = Query(None),
    department_id: Optional[UUID] = Query(None, description="Filter by department"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    scope_dept_id: Optional[UUID] = Depends(get_department_scope),
    service: AdminService = Depends(get_admin_service),
    _ = Depends(require_admin)
):
    effective_dept_id = scope_dept_id if scope_dept_id is not None else department_id
    faculty, _ = await service.list_faculty(status=status, department_id=effective_dept_id, skip=skip, limit=limit)
    return APIResponse(success=True, data=[map_faculty_response(f) for f in faculty])

@router.get("/faculty/{id}", response_model=APIResponse[FacultyItemResponse])
async def get_faculty(
    id: UUID,
    service: AdminService = Depends(get_admin_service),
    _ = Depends(require_permission(Perms.FACULTY_PROFILE_VIEW))
):
    try:
        f = await service.get_faculty(id)
        return APIResponse(success=True, data=map_faculty_response(f))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.patch("/faculty/{id}", response_model=APIResponse[FacultyItemResponse])
async def update_faculty(
    id: UUID,
    request: FacultyUpdateRequest,
    service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(require_permission(Perms.FACULTY_PROFILE_EDIT))
):
    try:
        await service.update_faculty(id, request, current_user)
        f = await service.get_faculty(id)
        return APIResponse(success=True, message="Faculty updated successfully", data=map_faculty_response(f))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.patch("/faculty/{id}/status")
async def update_faculty_status(
    id: UUID,
    request: FacultyStatusUpdateRequest,
    service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(require_permission(Perms.FACULTY_PROFILE_EDIT))
):
    try:
        user = await service.update_faculty_status(id, request, current_user)
        return APIResponse(success=True, message="Faculty status updated successfully", data={"account_status": user.account_status})
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/staff", response_model=APIResponse[List[StaffItemResponse]])
async def list_staff(
    status: Optional[str] = Query(None, description="Filter by account status"),
    department_id: Optional[UUID] = Query(None, description="Filter by department"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    scope_dept_id: Optional[UUID] = Depends(get_department_scope),
    service: AdminService = Depends(get_admin_service),
    _ = Depends(require_permission(Perms.STAFF_PROFILE_LIST))
):
    effective_dept_id = scope_dept_id if scope_dept_id is not None else department_id
    staff_members, _ = await service.list_staff(status=status, department_id=effective_dept_id, skip=skip, limit=limit)
    return APIResponse(success=True, data=[map_staff_response(s) for s in staff_members])

@router.post(
    "/staff",
    response_model=APIResponse[StaffItemResponse]
)
async def create_staff(
    request: StaffCreateRequest,
    service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(require_permission(Perms.STAFF_PROFILE_CREATE))
):

    try:
        user = await service.create_staff(request, current_user)
        staff = await service.get_staff(user.id)
        return APIResponse(success=True, message="Staff member created successfully", data=map_staff_response(staff))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/staff/{id}", response_model=APIResponse[StaffItemResponse])
async def get_staff(
    id: UUID,
    service: AdminService = Depends(get_admin_service),
    _ = Depends(require_permission(Perms.STAFF_PROFILE_VIEW))
):
    try:
        staff = await service.get_staff(id)
        return APIResponse(success=True, data=map_staff_response(staff))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.patch("/staff/{id}", response_model=APIResponse[StaffItemResponse])
async def update_staff(
    id: UUID,
    request: StaffUpdateRequest,
    service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(require_permission(Perms.STAFF_PROFILE_EDIT))
):
    try:
        await service.update_staff(id, request, current_user)
        staff = await service.get_staff(id)
        return APIResponse(success=True, message="Staff member updated successfully", data=map_staff_response(staff))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.patch("/staff/{id}/status")
async def update_staff_status(
    id: UUID,
    request: StaffStatusUpdateRequest,
    service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(require_permission(Perms.STAFF_PROFILE_EDIT))
):
    try:
        user = await service.update_staff_status(id, request, current_user)
        return APIResponse(success=True, message="Staff status updated successfully", data={"account_status": user.account_status})
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


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
    url = await upload_avatar(file, str(user.id))
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
        status_code = status.HTTP_404_NOT_FOUND if "not found" in str(e).lower() else status.HTTP_400_BAD_REQUEST
        raise HTTPException(status_code=status_code, detail=str(e))


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
    has_users = (res.scalar() or 0) > 1
    res = await db.execute(select(func.count(Role.id)))
    has_roles = (res.scalar() or 0) > 2
    res = await db.execute(select(func.count(Department.id)))
    has_depts = (res.scalar() or 0) > 0
    res = await db.execute(select(func.count(Course.id)))
    has_courses = (res.scalar() or 0) > 0
    
    tasks = [
        OnboardingTask(id="users", title="Create Users", description="Add first users", is_completed=has_users, action_url="/admin/users/create"),
        OnboardingTask(id="roles", title="Configure Roles", description="Set up RBAC", is_completed=has_roles, action_url="/admin/roles"),
        OnboardingTask(id="depts", title="Departments", description="Add departments", is_completed=has_depts, action_url="/admin/departments"),
        OnboardingTask(id="courses", title="Courses", description="Add courses", is_completed=has_courses, action_url="/admin/courses"),
    ]
    completed = sum(1 for t in tasks if t.is_completed)
    percentage = int((completed / len(tasks)) * 100)
    
    return APIResponse(success=True, data=OnboardingStatusResponse(completion_percentage=percentage, tasks=tasks))

@router.get(
    "/users",
    response_model=APIResponse[List[UserManagementItemResponse]],
    summary="List all users"
)
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    service: AdminService = Depends(get_admin_service),
    _ = Depends(require_permission(Perms.USER_LIST))
):
    users, total = await service.list_users(skip=skip, limit=limit)
    # Using UserManagementItemResponse will filter out sensitive fields
    return APIResponse(
        success=True,
        data=[UserManagementItemResponse.model_validate(user) for user in users],
        error=None,
        meta={"total": total, "skip": skip, "limit": limit}
    )

@router.patch(
    "/users/{id}",
    response_model=APIResponse[UserManagementItemResponse],
    summary="Update a user"
)
async def update_user(
    id: UUID,
    data: UserManagementUpdateRequest,
    current_user: User = Depends(require_permission(Perms.USER_EDIT)),
    service: AdminService = Depends(get_admin_service)
):
    try:
        user = await service.update_user(id, data, current_user)
        return APIResponse(
            success=True,
            data=UserManagementItemResponse.model_validate(user),
            error=None
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))




