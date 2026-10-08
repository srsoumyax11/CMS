from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
from uuid import UUID
from datetime import date

from app.core.uow import UnitOfWork
from app.api.deps import get_uow, get_current_user, require_permission
from app.models.user import User
from app.core.permissions import Perms
from app.schemas.common import APIResponse
from app.schemas.academic import (
    DepartmentCreate, DepartmentUpdate, DepartmentResponse, DepartmentListResponse,
    CourseCreate, CourseUpdate, CourseResponse, CourseListResponse,
    AcademicTermCreate, AcademicTermUpdate, AcademicTermResponse, AcademicTermListResponse,
    SubjectCreate, SubjectUpdate, SubjectResponse, SubjectListResponse,
    ClassGroupCreate, ClassGroupUpdate, ClassGroupResponse, ClassGroupListResponse,
    HolidayCreate, HolidayUpdate, HolidayResponse, HolidayListResponse
)
from app.services.academic_service import AcademicService

router = APIRouter(tags=["Academic Management"])

# --- Departments ---
@router.post(
    "/departments",
    summary="Create Department",
    description="Creates a new academic or administrative department. **Requires:** `academic:manage`",
    response_model=APIResponse[DepartmentResponse]
)
async def create_department(
    req: DepartmentCreate,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_permission(Perms.ACADEMIC_MANAGE))
):
    service = AcademicService(uow)
    try:
        dep = await service.create_department(req)
        return APIResponse(success=True, data=DepartmentResponse.model_validate(dep))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get(
    "/departments",
    summary="List Departments",
    description="Lists all departments.",
    response_model=APIResponse[DepartmentListResponse]
)
async def list_departments(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(get_current_user)
):
    service = AcademicService(uow)
    items_raw, total = await service.list_departments(skip=skip, limit=limit)
    items = [DepartmentResponse.model_validate(item) for item in items_raw]
    return APIResponse(success=True, data=DepartmentListResponse(total=total, items=items))

@router.put(
    "/departments/{dep_id}",
    summary="Update Department",
    description="Updates department details. **Requires:** `academic:manage`",
    response_model=APIResponse[DepartmentResponse]
)
async def update_department(
    dep_id: UUID,
    req: DepartmentUpdate,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_permission(Perms.ACADEMIC_MANAGE))
):
    service = AcademicService(uow)
    try:
        dep = await service.update_department(dep_id, req)
        return APIResponse(success=True, data=DepartmentResponse.model_validate(dep))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# --- Courses ---
@router.post(
    "/courses",
    summary="Create Course / Program",
    description="Creates a degree course/program definition. **Requires:** `academic:manage`",
    response_model=APIResponse[CourseResponse]
)
async def create_course(
    req: CourseCreate,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_permission(Perms.ACADEMIC_MANAGE))
):
    service = AcademicService(uow)
    try:
        course = await service.create_course(req)
        return APIResponse(success=True, data=CourseResponse.model_validate(course))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get(
    "/courses",
    summary="List Courses",
    description="Lists degree courses.",
    response_model=APIResponse[CourseListResponse]
)
async def list_courses(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(get_current_user)
):
    service = AcademicService(uow)
    items_raw, total = await service.list_courses(skip=skip, limit=limit)
    items = [CourseResponse.model_validate(item) for item in items_raw]
    return APIResponse(success=True, data=CourseListResponse(total=total, items=items))

# --- Academic Terms ---
@router.post(
    "/terms",
    summary="Create Academic Term",
    description="Creates an academic term/semester schedule. **Requires:** `academic:manage`",
    response_model=APIResponse[AcademicTermResponse]
)
async def create_term(
    req: AcademicTermCreate,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_permission(Perms.ACADEMIC_MANAGE))
):
    service = AcademicService(uow)
    try:
        term = await service.create_term(req)
        return APIResponse(success=True, data=AcademicTermResponse.model_validate(term))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get(
    "/terms",
    summary="List Academic Terms",
    description="Lists all academic terms.",
    response_model=APIResponse[AcademicTermListResponse]
)
async def list_terms(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(get_current_user)
):
    service = AcademicService(uow)
    items_raw, total = await service.list_terms(skip=skip, limit=limit)
    items = [AcademicTermResponse.model_validate(item) for item in items_raw]
    return APIResponse(success=True, data=AcademicTermListResponse(total=total, items=items))

@router.get(
    "/terms/current",
    summary="Get Active Current Term",
    description="Fetches the active current academic term.",
    response_model=APIResponse[AcademicTermResponse]
)
async def get_current_term(
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(get_current_user)
):
    service = AcademicService(uow)
    try:
        term = await service.get_current_term()
        return APIResponse(success=True, data=AcademicTermResponse.model_validate(term))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post(
    "/terms/{term_id}/set-current",
    summary="Set Active Current Term",
    description="Sets a specific term as the active current term and deactivates others. **Requires:** `academic:manage`",
    response_model=APIResponse[AcademicTermResponse]
)
async def set_current_term(
    term_id: UUID,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_permission(Perms.ACADEMIC_MANAGE))
):
    service = AcademicService(uow)
    try:
        term = await service.set_current_term(term_id)
        return APIResponse(success=True, data=AcademicTermResponse.model_validate(term))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# --- Subjects ---
@router.post(
    "/subjects",
    summary="Create Subject",
    description="Creates a subject in a department. **Requires:** `academic:manage`",
    response_model=APIResponse[SubjectResponse]
)
async def create_subject(
    req: SubjectCreate,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_permission(Perms.ACADEMIC_MANAGE))
):
    service = AcademicService(uow)
    try:
        sub = await service.create_subject(req)
        return APIResponse(success=True, data=SubjectResponse.model_validate(sub))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get(
    "/subjects",
    summary="List Subjects",
    description="Lists subjects with optional filtering by department.",
    response_model=APIResponse[SubjectListResponse]
)
async def list_subjects(
    department_id: Optional[UUID] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(get_current_user)
):
    service = AcademicService(uow)
    items_raw, total = await service.list_subjects(department_id=department_id, skip=skip, limit=limit)
    items = [SubjectResponse.model_validate(item) for item in items_raw]
    return APIResponse(success=True, data=SubjectListResponse(total=total, items=items))

# --- Class Groups ---
@router.post(
    "/class-groups",
    summary="Create Class Group Cohort",
    description="Creates a student cohort class group (Course + Department + Year + Section). **Requires:** `academic:manage`",
    response_model=APIResponse[ClassGroupResponse]
)
async def create_class_group(
    req: ClassGroupCreate,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_permission(Perms.ACADEMIC_MANAGE))
):
    service = AcademicService(uow)
    try:
        cg = await service.create_class_group(req)
        return APIResponse(success=True, data=ClassGroupResponse.model_validate(cg))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get(
    "/class-groups",
    summary="List Class Groups",
    description="Lists student cohorts.",
    response_model=APIResponse[ClassGroupListResponse]
)
async def list_class_groups(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(get_current_user)
):
    service = AcademicService(uow)
    items_raw, total = await service.list_class_groups(skip=skip, limit=limit)
    items = [ClassGroupResponse.model_validate(item) for item in items_raw]
    return APIResponse(success=True, data=ClassGroupListResponse(total=total, items=items))

# --- Holidays ---
@router.post(
    "/holidays",
    summary="Register Holiday",
    description="Registers a holiday date. **Requires:** `academic:manage`",
    response_model=APIResponse[HolidayResponse]
)
async def create_holiday(
    req: HolidayCreate,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_permission(Perms.ACADEMIC_MANAGE))
):
    service = AcademicService(uow)
    try:
        hol = await service.create_holiday(req)
        return APIResponse(success=True, data=HolidayResponse.model_validate(hol))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get(
    "/holidays",
    summary="List Holidays in Range",
    description="Lists holidays within a date range.",
    response_model=APIResponse[HolidayListResponse]
)
async def list_holidays(
    start_date: date = Query(...),
    end_date: date = Query(...),
    department_id: Optional[UUID] = Query(None),
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(get_current_user)
):
    service = AcademicService(uow)
    items_raw = await service.list_holidays(start_date=start_date, end_date=end_date, department_id=department_id)
    items = [HolidayResponse.model_validate(item) for item in items_raw]
    return APIResponse(success=True, data=HolidayListResponse(total=len(items), items=items))
