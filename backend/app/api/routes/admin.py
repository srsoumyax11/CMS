from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from uuid import UUID
from typing import List, Optional

from app.core.database import get_db
from app.api.deps import require_permission
from app.core.permissions import Perms
from app.core.security import hash_password
from app.models.user import User, UserType, AccountStatus
from app.models.profiles import StudentProfile, FacultyProfile
from app.models.rbac import Role
from app.schemas.common import APIResponse
from app.utils.validation import validate_password
from app.models.academic import Department, Course
from app.schemas.admin import (
    StudentStatusUpdateRequest, StudentItemResponse, StudentAdminUpdateRequest,
    FacultyCreateRequest, FacultyItemResponse,
    FacultyUpdateRequest, AdminItemResponse,
    DepartmentResponse, DepartmentCreateRequest, DepartmentUpdateRequest,
    OnboardingStatusResponse, OnboardingTask,
    CourseCreateRequest, CourseUpdateRequest, CourseItemResponse
)

router = APIRouter()

@router.get(
    "/students", 
    summary="List Students", 
    description="Fetches a list of all students, optionally filtered by status. **Requires:** `student_profile:list`",
    response_model=APIResponse[List[StudentItemResponse]]
)
async def list_students(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by account status (pending, active, rejected)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    _ = Depends(require_permission(Perms.STUDENT_PROFILE_LIST))
):
    stmt = select(User).outerjoin(StudentProfile, User.id == StudentProfile.user_id).options(
        selectinload(User.student_profile).selectinload(StudentProfile.course),
        selectinload(User.student_profile).selectinload(StudentProfile.department)
    ).where(User.user_type == UserType.student)
    
    if status_filter:
        stmt = stmt.where(User.account_status == status_filter)
    
    stmt = stmt.offset(skip).limit(limit)
    result = await db.execute(stmt)
    users = result.scalars().all()
    
    data = []
    for u in users:
        p = u.student_profile
        data.append(StudentItemResponse(
            id=u.id,
            user_id=u.user_id if u.user_id else str(u.id),
            name=u.name,
            email=u.email,
            course_id=p.course_id if p else None,
            course_name=p.course.name if p and p.course else "",
            department_id=p.department_id if p else None,
            department_name=p.department.name if p and p.department else "",
            year=p.year if p else 0,
            hostel=p.hostel if p else None,
            account_status=u.account_status,
            academic_status=p.academic_status if p else None,
            status_note=u.status_note
        ))
        
    return APIResponse(success=True, data=data, error=None)

@router.get(
    "/students/{id}", 
    summary="Get Student Detail", 
    description="Fetches the full profile details for a specific student. **Requires:** `student_profile:view`",
    response_model=APIResponse[StudentItemResponse]
)
async def get_student(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    _ = Depends(require_permission(Perms.STUDENT_PROFILE_LIST))
):
    stmt = select(User).outerjoin(StudentProfile, User.id == StudentProfile.user_id).options(
        selectinload(User.student_profile).selectinload(StudentProfile.course),
        selectinload(User.student_profile).selectinload(StudentProfile.department)
    ).where(User.user_type == UserType.student).where((User.id == id) | (StudentProfile.id == id))
    
    result = await db.execute(stmt)
    u = result.scalar_one_or_none()
    
    if not u:
        raise HTTPException(status_code=404, detail="Student not found")
        
    p = u.student_profile
    data = StudentItemResponse(
        id=u.id,
        user_id=u.user_id if u.user_id else str(u.id),
        name=u.name,
        email=u.email,
        course_name=p.course.name if p and p.course else "",
        department_name=p.department.name if p and p.department else "",
        year=p.year if p else 0,
        account_status=u.account_status,
        academic_status=p.academic_status if p else None,
        status_note=u.status_note
    )
    return APIResponse(success=True, data=data, error=None)

@router.patch(
    "/students/{id}/status", 
    summary="Update Student Status", 
    description="Updates a student's account status or academic status. **Requires:** `student_profile:edit`",
    response_model=APIResponse[StudentItemResponse]
)
async def update_student_status(
    id: UUID,
    req: StudentStatusUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Perms.STUDENT_PROFILE_LIST)) # Baseline admin check
):
    from app.api.deps import get_user_permissions
    user_perms = await get_user_permissions(current_user)
    
    if req.account_status == AccountStatus.active and Perms.STUDENT_PROFILE_APPROVE not in user_perms:
        raise HTTPException(status_code=403, detail="Insufficient permission to approve")
    if req.account_status == AccountStatus.rejected and Perms.STUDENT_PROFILE_REJECT not in user_perms:
        raise HTTPException(status_code=403, detail="Insufficient permission to reject")
    if (req.account_status and req.account_status not in [AccountStatus.active, AccountStatus.rejected]) or req.academic_status:
        if Perms.STUDENT_PROFILE_EDIT not in user_perms:
            raise HTTPException(status_code=403, detail="Insufficient permission to edit statuses")

    stmt = select(User).outerjoin(StudentProfile, User.id == StudentProfile.user_id).options(
        selectinload(User.student_profile).selectinload(StudentProfile.course),
        selectinload(User.student_profile).selectinload(StudentProfile.department)
    ).where(User.user_type == UserType.student).where((User.id == id) | (StudentProfile.id == id))
    result = await db.execute(stmt)
    u = result.scalar_one_or_none()
    
    if not u:
        raise HTTPException(status_code=404, detail="Student not found")
        
    if req.account_status == AccountStatus.active and not getattr(u, "student_profile", None):
        raise HTTPException(status_code=422, detail="Cannot approve student: Student profile is incomplete")
        
    p = u.student_profile
    if req.academic_status and p:
        p.academic_status = req.academic_status

    if req.account_status:
        u.account_status = req.account_status
        if req.account_status == AccountStatus.active:
            # Assign 'Student' role
            role_stmt = select(Role).where(Role.name == "Student")
            role_res = await db.execute(role_stmt)
            student_role = role_res.scalar_one_or_none()
            if student_role and u.role_id != student_role.id:
                u.role_id = student_role.id

    if req.status_note is not None:
        u.status_note = req.status_note

    await db.commit()
    await db.refresh(u)
    if p:
        await db.refresh(p)
    
    data = StudentItemResponse(
        id=u.id,
        user_id=u.user_id if u.user_id else str(u.id),
        name=u.name,
        email=u.email,
        course_id=p.course_id if p else None,
        course_name=p.course.name if p and p.course else "",
        department_id=p.department_id if p else None,
        department_name=p.department.name if p and p.department else "",
        year=p.year if p else 0,
        hostel=p.hostel if p else None,
        account_status=u.account_status,
        academic_status=p.academic_status if p else None,
        status_note=u.status_note
    )
    return APIResponse(success=True, data=data, error=None)

@router.put(
    "/students/{id}",
    summary="Update Student Details",
    description="Updates a student's profile details. **Requires:** `student_profile:edit`",
    response_model=APIResponse[StudentItemResponse]
)
async def update_student_details(
    id: UUID,
    req: StudentAdminUpdateRequest,
    db: AsyncSession = Depends(get_db),
    _ = Depends(require_permission(Perms.STUDENT_PROFILE_EDIT))
):
    stmt = select(User).outerjoin(StudentProfile, User.id == StudentProfile.user_id).options(
        selectinload(User.student_profile).selectinload(StudentProfile.course),
        selectinload(User.student_profile).selectinload(StudentProfile.department)
    ).where(User.user_type == UserType.student).where((User.id == id) | (StudentProfile.id == id))
    result = await db.execute(stmt)
    u = result.scalar_one_or_none()
    
    if not u:
        raise HTTPException(status_code=404, detail="Student not found")
        
    if req.name is not None:
        u.name = req.name
        
    p = u.student_profile
    if p:
        if req.course_id is not None:
            p.course_id = req.course_id
        if req.department_id is not None:
            p.department_id = req.department_id
        if req.year is not None:
            p.year = req.year
        if req.hostel is not None:
            p.hostel = req.hostel.strip().lower()

    await db.commit()
    await db.refresh(u)
    if p:
        await db.refresh(p)
        
    data = StudentItemResponse(
        id=u.id,
        user_id=u.user_id if u.user_id else str(u.id),
        name=u.name,
        email=u.email,
        course_id=p.course_id if p else None,
        course_name=p.course.name if p and p.course else "",
        department_id=p.department_id if p else None,
        department_name=p.department.name if p and p.department else "",
        year=p.year if p else 0,
        hostel=p.hostel if p else None,
        account_status=u.account_status,
        academic_status=p.academic_status if p else None,
        status_note=u.status_note
    )
    return APIResponse(success=True, data=data, error=None)

@router.post(
    "/faculty", 
    summary="Create Faculty", 
    description="Creates a new faculty user and assigns the default 'Faculty' role. **Requires:** `faculty_profile:create`",
    response_model=APIResponse[FacultyItemResponse]
)
async def create_faculty(
    req: FacultyCreateRequest,
    db: AsyncSession = Depends(get_db),
    _ = Depends(require_permission(Perms.FACULTY_PROFILE_CREATE))
):
    # Validate password against system settings
    await validate_password(req.password, db)

    existing = await db.execute(select(User).where(User.email == req.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Validate Course and Department
    from app.models.academic import Course
    course_res = await db.execute(select(Course).where(Course.id == req.course_id, Course.is_active == True))
    dept_res = await db.execute(select(Department).where(Department.id == req.department_id, Department.is_active == True))
    
    course_obj = course_res.scalar_one_or_none()
    dept_obj = dept_res.scalar_one_or_none()
    if not course_obj or not dept_obj:
        raise HTTPException(status_code=400, detail="Invalid or inactive course/department")

    import random
    
    # Generate unique numeric user_id for faculty (e.g., 6 digits)
    while True:
        candidate_id = str(random.randint(100000, 999999))
        existing_id = await db.execute(select(User).where(User.user_id == candidate_id))
        if not existing_id.scalar_one_or_none():
            break

    new_user = User(
        email=req.email,
        hashed_password=hash_password(req.password),
        user_type=UserType.faculty,
        name=req.name,
        user_id=candidate_id,
        account_status=AccountStatus.active
    )
    db.add(new_user)
    await db.flush()
    
    from app.models.profiles import EmploymentStatus
    new_profile = FacultyProfile(
        user_id=new_user.id,
        course_id=req.course_id,
        department_id=req.department_id,
        designation=req.designation,
        employment_status=EmploymentStatus.active
    )
    db.add(new_profile)
    
    # Assign 'Faculty' role and any requested roles
    assigned_role_id = None
    if req.role_id:
        req_role = await db.get(Role, req.role_id)
        if req_role:
            if req_role.name in ["Student", "SuperAdmin"]:
                raise HTTPException(status_code=400, detail="Cannot assign Student or SuperAdmin role to a faculty member")
            assigned_role_id = req_role.id
            if req_role.name == "Admin":
                new_user.user_type = UserType.admin
                
    if not assigned_role_id:
        role_stmt = select(Role).where(Role.name == "Faculty")
        fac_role = (await db.execute(role_stmt)).scalar_one_or_none()
        assigned_role_id = fac_role.id if fac_role else None
        
    new_user.role_id = assigned_role_id
        
    await db.commit()
    await db.refresh(new_profile)
    
    # Need to load department explicitly for the response
    stmt = select(Department).where(Department.id == new_profile.department_id)
    res = await db.execute(stmt)
    dept = res.scalar_one_or_none()

    data = FacultyItemResponse(
        id=new_user.id,
        user_id=new_user.user_id if new_user.user_id else str(new_profile.user_id),
        name=new_user.name,
        email=new_user.email,
        course_id=new_profile.course_id,
        course_name=course_obj.name,
        department_id=new_profile.department_id,
        department_name=dept_obj.name,
        designation=new_profile.designation,
        is_hod=(dept_obj.hod_user_id == new_user.id) if dept_obj else False,
        account_status=new_user.account_status,
        employment_status=new_profile.employment_status,
        status_note=new_user.status_note
    )
    return APIResponse(success=True, data=data, error=None)

@router.get(
    "/faculty", 
    summary="List Faculty", 
    description="Fetches a list of all faculty members. **Requires:** `faculty_profile:list`",
    response_model=APIResponse[List[FacultyItemResponse]]
)
async def list_faculty(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by account status (pending, active, rejected)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    _ = Depends(require_permission(Perms.FACULTY_PROFILE_LIST))
):
    stmt = select(FacultyProfile).options(
        selectinload(FacultyProfile.user),
        selectinload(FacultyProfile.course),
        selectinload(FacultyProfile.department)
    )
    if status_filter:
        stmt = stmt.join(User, FacultyProfile.user_id == User.id).where(
            (User.account_status == status_filter) & (~User.role.has(Role.name == 'SuperAdmin'))
        )
    else:
        stmt = stmt.join(User, FacultyProfile.user_id == User.id).where(
            ~User.role.has(Role.name == 'SuperAdmin')
        )
    stmt = stmt.offset(skip).limit(limit)
    
    result = await db.execute(stmt)
    profiles = result.scalars().all()
    
    data = []
    for p in profiles:
        data.append(FacultyItemResponse(
            id=p.user_id,
            user_id=p.user.user_id if p.user and p.user.user_id else str(p.user_id),
            name=p.user.name if p.user else "",
            email=p.user.email if p.user else "",
            course_id=p.course_id,
            course_name=p.course.name if p.course else "Unknown",
            department_id=p.department_id,
            department_name=p.department.name if p.department else "Unknown",
            designation=p.designation,
            is_hod=(p.department.hod_user_id == p.user_id) if p.department else False,
            account_status=p.user.account_status if p.user else AccountStatus.pending,
            employment_status=p.employment_status,
            status_note=p.user.status_note if p.user else None
        ))
        
    return APIResponse(success=True, data=data, error=None)

@router.patch(
    "/faculty/{id}", 
    summary="Update Faculty", 
    description="Updates faculty profile details (like department or designation). **Requires:** `faculty_profile:edit`",
    response_model=APIResponse[FacultyItemResponse]
)
async def update_faculty(
    id: UUID,
    req: FacultyUpdateRequest,
    db: AsyncSession = Depends(get_db),
    _ = Depends(require_permission(Perms.FACULTY_PROFILE_EDIT))
):
    stmt = select(FacultyProfile).options(
        selectinload(FacultyProfile.user), 
        selectinload(FacultyProfile.course),
        selectinload(FacultyProfile.department)
    ).where((FacultyProfile.id == id) | (FacultyProfile.user_id == id))
    result = await db.execute(stmt)
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Faculty profile not found")
        
    if p.user and getattr(p.user.role, "name", "") == "SuperAdmin":
        raise HTTPException(status_code=403, detail="Cannot modify SuperAdmin account")
        
    if req.name and p.user:
        p.user.name = req.name
    if req.email and p.user:
        p.user.email = req.email
    if req.course_id is not None:
        p.course_id = req.course_id
    if req.department_id is not None:
        p.department_id = req.department_id
    if req.designation is not None:
        p.designation = req.designation
    if req.account_status and p.user:
        p.user.account_status = req.account_status
    if req.employment_status:
        p.employment_status = req.employment_status
        
    await db.commit()
    await db.refresh(p)
    
    # Load course/department explicitly if changed
    dept_name = p.department.name if p.department else "Unknown"
    is_hod = (p.department.hod_user_id == p.user_id) if p.department else False
    if req.department_id is not None:
         stmt = select(Department).where(Department.id == p.department_id)
         res = await db.execute(stmt)
         dept = res.scalar_one_or_none()
         if dept:
             dept_name = dept.name
             is_hod = (dept.hod_user_id == p.user_id)
             
    course_name = p.course.name if p.course else "Unknown"
    if req.course_id is not None:
        from app.models.academic import Course
        stmt = select(Course).where(Course.id == p.course_id)
        res = await db.execute(stmt)
        course = res.scalar_one_or_none()
        if course:
            course_name = course.name

    data = FacultyItemResponse(
        id=p.user_id,
        user_id=p.user.user_id if p.user.user_id else str(p.user_id),
        name=p.user.name,
        email=p.user.email,
        course_id=p.course_id,
        course_name=course_name,
        department_id=p.department_id,
        department_name=dept_name,
        designation=p.designation,
        is_hod=is_hod,
        account_status=p.user.account_status,
        employment_status=p.employment_status,
        status_note=p.user.status_note
    )
    return APIResponse(success=True, data=data, error=None)

@router.get(
    "/admins",
    summary="List Admins",
    description="Fetches a list of all administrators. **Requires:** `faculty_profile:list`",
    response_model=APIResponse[List[AdminItemResponse]]
)
async def list_admins(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by account status (pending, active, rejected)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    _ = Depends(require_permission(Perms.FACULTY_PROFILE_LIST))
):
    stmt = select(User).where(
        (User.user_type == UserType.admin) &
        (~User.role.has(Role.name == 'SuperAdmin'))
    )
    if status_filter:
        stmt = stmt.where(User.account_status == status_filter)
    stmt = stmt.offset(skip).limit(limit)
    
    result = await db.execute(stmt)
    users = result.scalars().all()
    
    data = []
    for u in users:
        data.append(AdminItemResponse(
            id=u.id,  # using user's internal UUID as id for the row
            user_id=u.user_id if u.user_id else str(u.id),
            user_uuid=u.id,
            name=u.name or "",
            email=u.email,
            account_status=u.account_status,
            status_note=u.status_note
        ))
        
    return APIResponse(success=True, data=data, error=None)

from app.models.settings import SystemSetting
from app.schemas.admin import SystemSettingResponse, SystemSettingUpdateRequest

@router.get(
    "/settings",
    summary="Get System Settings",
    description="Fetches all global system settings. **Requires:** `system_setting:manage`",
    response_model=APIResponse[List[SystemSettingResponse]]
)
async def get_system_settings(
    db: AsyncSession = Depends(get_db),
    _ = Depends(require_permission(Perms.SYSTEM_SETTING_MANAGE))
):
    stmt = select(SystemSetting)
    result = await db.execute(stmt)
    settings = result.scalars().all()
    
    data = [
        SystemSettingResponse(
            key=s.key, 
            value=s.value, 
            category=s.category,
            data_type=s.data_type,
            is_public=s.is_public,
            description=s.description
        )
        for s in settings
    ]
    return APIResponse(success=True, data=data, error=None)

@router.patch(
    "/settings/{key}",
    summary="Update System Setting",
    description="Updates a specific system setting. **Requires:** `system_setting:manage`",
    response_model=APIResponse[SystemSettingResponse]
)
async def update_system_setting(
    key: str,
    data: SystemSettingUpdateRequest,
    db: AsyncSession = Depends(get_db),
    _ = Depends(require_permission(Perms.SYSTEM_SETTING_MANAGE))
):
    stmt = select(SystemSetting).where(SystemSetting.key == key)
    result = await db.execute(stmt)
    setting = result.scalar_one_or_none()
    
    if not setting:
        raise HTTPException(status_code=404, detail="Setting not found")
        
    setting.value = data.value
    await db.commit()
    
    response_data = SystemSettingResponse(
        key=setting.key, 
        value=setting.value,
        category=setting.category,
        data_type=setting.data_type,
        is_public=setting.is_public,
        description=setting.description
    )
    return APIResponse(success=True, data=response_data, error=None)

# ── Departments ────────────────────────────────────────────────────────
@router.get(
    "/departments",
    summary="List Departments",
    description="Returns all departments.",
    response_model=APIResponse[List[DepartmentResponse]]
)
async def list_departments(
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Department).order_by(Department.name)
    result = await db.execute(stmt)
    departments = result.scalars().all()
    
    data = [
        DepartmentResponse(
            id=d.id, name=d.name, code=d.code, department_type=d.department_type, is_active=d.is_active, hod_user_id=d.hod_user_id
        ) for d in departments
    ]
    return APIResponse(success=True, data=data, error=None)

@router.post(
    "/departments",
    summary="Create Department",
    description="Creates a new department. **Requires:** `department:manage`",
    response_model=APIResponse[DepartmentResponse]
)
async def create_department(
    req: DepartmentCreateRequest,
    db: AsyncSession = Depends(get_db),
    _ = Depends(require_permission(Perms.DEPARTMENT_MANAGE))
):
    # Check if name or code already exists
    existing = await db.execute(
        select(Department).where((Department.name == req.name) | (Department.code == req.code))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Department with this name or code already exists")
        
    new_dept = Department(name=req.name, code=req.code, department_type=req.department_type, is_active=req.is_active, hod_user_id=req.hod_user_id)
    db.add(new_dept)
    
    try:
        await db.commit()
        await db.refresh(new_dept)
    except Exception:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Database error")
        
    return APIResponse(success=True, data=DepartmentResponse(
        id=new_dept.id, name=new_dept.name, code=new_dept.code, department_type=new_dept.department_type, is_active=new_dept.is_active, hod_user_id=new_dept.hod_user_id
    ), error=None)

@router.patch(
    "/departments/{id}",
    summary="Update Department",
    description="Updates a department. **Requires:** `department:manage`",
    response_model=APIResponse[DepartmentResponse]
)
async def update_department(
    id: UUID,
    req: DepartmentUpdateRequest,
    db: AsyncSession = Depends(get_db),
    _ = Depends(require_permission(Perms.DEPARTMENT_MANAGE))
):
    stmt = select(Department).where(Department.id == id)
    result = await db.execute(stmt)
    dept = result.scalar_one_or_none()
    
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
        
    update_data = req.model_dump(exclude_unset=True)
    
    if "name" in update_data:
        dept.name = update_data["name"]
    if "code" in update_data:
        dept.code = update_data["code"]
    if "is_active" in update_data:
        dept.is_active = update_data["is_active"]
    if "department_type" in update_data:
        dept.department_type = update_data["department_type"]
        
    if "hod_user_id" in update_data:
        new_hod_id = update_data["hod_user_id"]
        old_hod_id = dept.hod_user_id
        
        if new_hod_id != old_hod_id:
            role_stmt = select(Role).where(Role.name == "HOD")
            hod_role = (await db.execute(role_stmt)).scalar_one_or_none()
            
            if hod_role:
                if old_hod_id:
                    old_hod = await db.get(User, old_hod_id)
                    fac_role = (await db.execute(select(Role).where(Role.name == "Faculty"))).scalar_one_or_none()
                    if old_hod and fac_role:
                        old_hod.role_id = fac_role.id
                        
                if new_hod_id:
                    new_hod = await db.get(User, new_hod_id)
                    if new_hod:
                        new_hod.role_id = hod_role.id
                        
        dept.hod_user_id = new_hod_id
        
    try:
        await db.commit()
        await db.refresh(dept)
    except Exception:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Database error or duplicate name/code")
        
    return APIResponse(success=True, data=DepartmentResponse(
        id=dept.id, name=dept.name, code=dept.code, department_type=dept.department_type, is_active=dept.is_active, hod_user_id=dept.hod_user_id
    ), error=None)

@router.delete(
    "/departments/{id}",
    summary="Delete Department",
    description="Deletes a department if it is not referenced by any faculty. **Requires:** `department:manage`",
    response_model=APIResponse[dict]
)
async def delete_department(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    _ = Depends(require_permission(Perms.DEPARTMENT_MANAGE))
):
    stmt = select(Department).where(Department.id == id)
    result = await db.execute(stmt)
    dept = result.scalar_one_or_none()
    
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
        
    # Check if any faculty profile uses this department
    faculty_stmt = select(FacultyProfile).where(FacultyProfile.department_id == id).limit(1)
    faculty_res = await db.execute(faculty_stmt)
    if faculty_res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Cannot delete department because it is assigned to faculty members")
        
    try:
        await db.delete(dept)
        await db.commit()
    except Exception:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Database error")
        
    return APIResponse(success=True, data={"message": "Department deleted successfully"}, error=None)

@router.get(
    "/onboarding-status",
    summary="Get Admin Onboarding Status",
    description="Returns the setup progress percentage and a list of pending tasks.",
    response_model=APIResponse[OnboardingStatusResponse]
)
async def get_onboarding_status(
    db: AsyncSession = Depends(get_db),
    _ = Depends(require_permission(Perms.SYSTEM_SETTING_MANAGE))
):
    from app.models.settings import SystemSetting
    from sqlalchemy import func

    tasks = []
    
    # 1. Check SMTP
    smtp_setting = await db.scalar(select(SystemSetting).where(SystemSetting.key == "smtp_host"))
    is_smtp_configured = smtp_setting is not None and smtp_setting.value != "127.0.0.1"
    tasks.append(OnboardingTask(
        id="smtp_setup",
        title="Configure Email Server (SMTP)",
        description="Connect a real SMTP server so the system can send password setup links to new users.",
        is_completed=is_smtp_configured,
        action_url="/admin/settings?tab=email"
    ))
    
    # 2. Check Site URL
    site_setting = await db.scalar(select(SystemSetting).where(SystemSetting.key == "site_url"))
    is_site_configured = site_setting is not None and site_setting.value is not None and "localhost" not in site_setting.value.lower()
    tasks.append(OnboardingTask(
        id="site_url",
        title="Set Live Domain URL",
        description="Update the Site URL setting to your production domain.",
        is_completed=is_site_configured,
        action_url="/admin/settings?tab=general"
    ))
    
    # 3. Check Departments
    dept_count = await db.scalar(select(func.count(Department.id)))
    is_dept_created = dept_count > 0
    tasks.append(OnboardingTask(
        id="departments",
        title="Create First Department",
        description="Set up at least one academic or administrative department.",
        is_completed=is_dept_created,
        action_url="/admin/departments"
    ))
    
    # 4. Check Faculty
    faculty_count = await db.scalar(select(func.count(User.id)).where(User.user_type == UserType.faculty))
    is_faculty_onboarded = faculty_count > 0
    tasks.append(OnboardingTask(
        id="faculty",
        title="Onboard Faculty",
        description="Create at least one Faculty member account to test the role system.",
        is_completed=is_faculty_onboarded,
        action_url="/admin/users?role=faculty"
    ))
    
    completed_count = sum(1 for t in tasks if t.is_completed)
    percentage = int((completed_count / len(tasks)) * 100) if tasks else 0
    
    return APIResponse(
        success=True,
        message="Onboarding status retrieved",
        data=OnboardingStatusResponse(
            completion_percentage=percentage,
            tasks=tasks
        ),
        error=None
    )

# --- Course Management ---

@router.get("/courses", response_model=APIResponse[List[CourseItemResponse]])
async def list_courses(db: AsyncSession = Depends(get_db), profile = Depends(require_permission(Perms.DEPARTMENT_MANAGE))):
    result = await db.execute(select(Course).order_by(Course.name))
    return APIResponse(success=True, data=result.scalars().all(), error=None)

@router.post("/courses", response_model=APIResponse[CourseItemResponse])
async def create_course(
    req: CourseCreateRequest, 
    db: AsyncSession = Depends(get_db), 
    profile = Depends(require_permission(Perms.DEPARTMENT_MANAGE))
):
    # Check if course exists
    existing = await db.execute(select(Course).where(Course.name == req.name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Course already exists")
        
    course = Course(name=req.name, is_active=req.is_active, duration_years=req.duration_years)
    db.add(course)
    await db.commit()
    await db.refresh(course)
    return APIResponse(success=True, data=course, error=None)

@router.patch("/courses/{course_id}", response_model=APIResponse[CourseItemResponse])
async def update_course(
    course_id: UUID, 
    req: CourseUpdateRequest, 
    db: AsyncSession = Depends(get_db),
    profile = Depends(require_permission(Perms.DEPARTMENT_MANAGE))
):
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
        
    if req.name is not None:
        # Check uniqueness
        if req.name != course.name:
            existing = await db.execute(select(Course).where(Course.name == req.name))
            if existing.scalar_one_or_none():
                raise HTTPException(status_code=400, detail="Course name already exists")
        course.name = req.name
        
    if req.is_active is not None:
        course.is_active = req.is_active
        
    if req.duration_years is not None:
        course.duration_years = req.duration_years
        
    await db.commit()
    await db.refresh(course)
    return APIResponse(success=True, data=course, error=None)

@router.delete("/courses/{course_id}")
async def delete_course(
    course_id: UUID, 
    db: AsyncSession = Depends(get_db),
    profile = Depends(require_permission(Perms.DEPARTMENT_MANAGE))
):
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
        
    await db.delete(course)
    await db.commit()
    return APIResponse(success=True, data={"message": "Course deleted successfully"}, error=None)
