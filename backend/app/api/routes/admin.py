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
from app.models.rbac import Role, UserRole
from app.schemas.common import APIResponse
from app.schemas.admin import (
    StudentStatusUpdateRequest, StudentItemResponse, StudentAdminUpdateRequest,
    FacultyCreateRequest, FacultyItemResponse,
    FacultyUpdateRequest, AdminItemResponse
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
        selectinload(User.student_profile).selectinload(StudentProfile.branch)
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
            id=p.id if p else u.id,
            user_id=u.user_id if u.user_id else str(u.id),
            user_uuid=u.id,
            name=u.name,
            email=u.email,
            course_id=p.course_id if p else None,
            course_name=p.course.name if p and p.course else "",
            branch_id=p.branch_id if p else None,
            branch_name=p.branch.name if p and p.branch else "",
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
        selectinload(User.student_profile).selectinload(StudentProfile.branch)
    ).where(User.user_type == UserType.student).where((User.id == id) | (StudentProfile.id == id))
    
    result = await db.execute(stmt)
    u = result.scalar_one_or_none()
    
    if not u:
        raise HTTPException(status_code=404, detail="Student not found")
        
    p = u.student_profile
    data = StudentItemResponse(
        id=p.id if p else u.id,
        user_id=u.user_id if u.user_id else str(u.id),
        user_uuid=u.id,
        name=u.name,
        email=u.email,
        course_name=p.course.name if p and p.course else "",
        branch_name=p.branch.name if p and p.branch else "",
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
        selectinload(User.student_profile).selectinload(StudentProfile.branch)
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
            if student_role:
                # Check if already has role
                ur_stmt = select(UserRole).where(UserRole.user_id == u.id, UserRole.role_id == student_role.id)
                ur_res = await db.execute(ur_stmt)
                if not ur_res.scalar_one_or_none():
                    db.add(UserRole(user_id=u.id, role_id=student_role.id))

    if req.status_note is not None:
        u.status_note = req.status_note

    await db.commit()
    await db.refresh(u)
    if p:
        await db.refresh(p)
    
    data = StudentItemResponse(
        id=p.id if p else u.id,
        user_id=u.user_id if u.user_id else str(u.id),
        user_uuid=u.id,
        name=u.name,
        email=u.email,
        course_id=p.course_id if p else None,
        course_name=p.course.name if p and p.course else "",
        branch_id=p.branch_id if p else None,
        branch_name=p.branch.name if p and p.branch else "",
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
        selectinload(User.student_profile).selectinload(StudentProfile.branch)
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
        if req.branch_id is not None:
            p.branch_id = req.branch_id
        if req.year is not None:
            p.year = req.year
        if req.hostel is not None:
            p.hostel = req.hostel.strip().lower()

    await db.commit()
    await db.refresh(u)
    if p:
        await db.refresh(p)
        
    data = StudentItemResponse(
        id=p.id if p else u.id,
        user_id=u.user_id if u.user_id else str(u.id),
        user_uuid=u.id,
        name=u.name,
        email=u.email,
        course_id=p.course_id if p else None,
        course_name=p.course.name if p and p.course else "",
        branch_id=p.branch_id if p else None,
        branch_name=p.branch.name if p and p.branch else "",
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
    # Check if email exists
    existing = await db.execute(select(User).where(User.email == req.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

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
        department=req.department,
        designation=req.designation,
        employment_status=EmploymentStatus.active
    )
    db.add(new_profile)
    
    # Assign 'Faculty' role
    role_stmt = select(Role).where(Role.name == "Faculty")
    role_res = await db.execute(role_stmt)
    fac_role = role_res.scalar_one_or_none()
    if fac_role:
        new_ur = UserRole(user_id=new_user.id, role_id=fac_role.id)
        db.add(new_ur)
        
    await db.commit()
    await db.refresh(new_profile)
    
    data = FacultyItemResponse(
        id=new_profile.id,
        user_id=new_user.user_id if new_user.user_id else str(new_profile.user_id),
        user_uuid=new_profile.user_id,
        name=new_user.name,
        email=new_user.email,
        department=new_profile.department,
        designation=new_profile.designation,
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
    stmt = select(FacultyProfile).options(selectinload(FacultyProfile.user))
    if status_filter:
        stmt = stmt.join(User, FacultyProfile.user_id == User.id).where(User.account_status == status_filter)
    stmt = stmt.offset(skip).limit(limit)
    
    result = await db.execute(stmt)
    profiles = result.scalars().all()
    
    data = []
    for p in profiles:
        data.append(FacultyItemResponse(
            id=p.id,
            user_id=p.user.user_id if p.user and p.user.user_id else str(p.user_id),
            user_uuid=p.user_id,
            name=p.user.name if p.user else "",
            email=p.user.email if p.user else "",
            department=p.department,
            designation=p.designation,
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
    stmt = select(FacultyProfile).options(selectinload(FacultyProfile.user)).where(FacultyProfile.id == id)
    result = await db.execute(stmt)
    p = result.scalar_one_or_none()
    
    if not p:
        raise HTTPException(status_code=404, detail="Faculty profile not found")
        
    if req.name is not None and p.user:
        p.user.name = req.name
    if req.email is not None and p.user:
        p.user.email = req.email
    if req.department is not None:
        p.department = req.department
    if req.designation is not None:
        p.designation = req.designation
    if req.employment_status is not None:
        p.employment_status = req.employment_status
        
    if req.account_status is not None and p.user:
        p.user.account_status = req.account_status
        
    await db.commit()
    await db.refresh(p)
    if p.user:
        await db.refresh(p.user)
    
    data = FacultyItemResponse(
        id=p.id,
        user_id=p.user.user_id if p.user and p.user.user_id else str(p.user_id),
        user_uuid=p.user_id,
        name=p.user.name if p.user else "",
        email=p.user.email if p.user else "",
        department=p.department,
        designation=p.designation,
        account_status=p.user.account_status if p.user else AccountStatus.pending,
        employment_status=p.employment_status,
        status_note=p.user.status_note if p.user else None
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
    stmt = select(User).where(User.user_type == UserType.admin)
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
