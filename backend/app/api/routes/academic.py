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

@router.delete(
    "/departments/{dep_id}",
    summary="Delete Department",
    description="Deletes a department. **Requires:** `academic:manage`",
    response_model=APIResponse[dict]
)
async def delete_department(
    dep_id: UUID,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_permission(Perms.ACADEMIC_MANAGE))
):
    service = AcademicService(uow)
    try:
        await service.delete_department(dep_id)
        return APIResponse(success=True, data={"message": "Department deleted successfully"})
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

@router.put(
    "/courses/{course_id}",
    summary="Update Course",
    description="Updates a degree course. **Requires:** `academic:manage`",
    response_model=APIResponse[CourseResponse]
)
async def update_course(
    course_id: UUID,
    req: CourseUpdate,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_permission(Perms.ACADEMIC_MANAGE))
):
    service = AcademicService(uow)
    try:
        course = await service.update_course(course_id, req)
        return APIResponse(success=True, data=CourseResponse.model_validate(course))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete(
    "/courses/{course_id}",
    summary="Delete Course",
    description="Deletes a degree course. **Requires:** `academic:manage`",
    response_model=APIResponse[dict]
)
async def delete_course(
    course_id: UUID,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_permission(Perms.ACADEMIC_MANAGE))
):
    service = AcademicService(uow)
    try:
        await service.delete_course(course_id)
        return APIResponse(success=True, data={"message": "Course deleted successfully"})
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

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

@router.put(
    "/terms/{term_id}",
    summary="Update Academic Term",
    description="Updates academic term details. **Requires:** `academic:manage`",
    response_model=APIResponse[AcademicTermResponse]
)
async def update_term(
    term_id: UUID,
    req: AcademicTermUpdate,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_permission(Perms.ACADEMIC_MANAGE))
):
    service = AcademicService(uow)
    try:
        term = await service.update_term(term_id, req)
        return APIResponse(success=True, data=AcademicTermResponse.model_validate(term))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete(
    "/terms/{term_id}",
    summary="Delete Academic Term",
    description="Deletes an academic term. **Requires:** `academic:manage`",
    response_model=APIResponse[dict]
)
async def delete_term(
    term_id: UUID,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_permission(Perms.ACADEMIC_MANAGE))
):
    service = AcademicService(uow)
    try:
        await service.delete_term(term_id)
        return APIResponse(success=True, data={"message": "Academic term deleted successfully"})
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

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

@router.put(
    "/subjects/{sub_id}",
    summary="Update Subject",
    description="Updates subject details. **Requires:** `academic:manage`",
    response_model=APIResponse[SubjectResponse]
)
async def update_subject(
    sub_id: UUID,
    req: SubjectUpdate,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_permission(Perms.ACADEMIC_MANAGE))
):
    service = AcademicService(uow)
    try:
        sub = await service.update_subject(sub_id, req)
        return APIResponse(success=True, data=SubjectResponse.model_validate(sub))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete(
    "/subjects/{sub_id}",
    summary="Delete Subject",
    description="Deletes a subject. **Requires:** `academic:manage`",
    response_model=APIResponse[dict]
)
async def delete_subject(
    sub_id: UUID,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_permission(Perms.ACADEMIC_MANAGE))
):
    service = AcademicService(uow)
    try:
        await service.delete_subject(sub_id)
        return APIResponse(success=True, data={"message": "Subject deleted successfully"})
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

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

@router.put(
    "/class-groups/{cg_id}",
    summary="Update Class Group Cohort",
    description="Updates a student cohort class group. **Requires:** `academic:manage`",
    response_model=APIResponse[ClassGroupResponse]
)
async def update_class_group(
    cg_id: UUID,
    req: ClassGroupUpdate,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_permission(Perms.ACADEMIC_MANAGE))
):
    service = AcademicService(uow)
    try:
        cg = await service.update_class_group(cg_id, req)
        return APIResponse(success=True, data=ClassGroupResponse.model_validate(cg))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete(
    "/class-groups/{cg_id}",
    summary="Delete Class Group Cohort",
    description="Deletes a student cohort class group. **Requires:** `academic:manage`",
    response_model=APIResponse[dict]
)
async def delete_class_group(
    cg_id: UUID,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_permission(Perms.ACADEMIC_MANAGE))
):
    service = AcademicService(uow)
    try:
        await service.delete_class_group(cg_id)
        return APIResponse(success=True, data={"message": "Class group deleted successfully"})
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

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
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    department_id: Optional[UUID] = Query(None),
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(get_current_user)
):
    service = AcademicService(uow)
    items_raw = await service.list_holidays(start_date=start_date, end_date=end_date, department_id=department_id)
    items = [HolidayResponse.model_validate(item) for item in items_raw]
    return APIResponse(success=True, data=HolidayListResponse(total=len(items), items=items))

@router.put(
    "/holidays/{holiday_id}",
    summary="Update Holiday",
    description="Updates holiday details. **Requires:** `academic:manage`",
    response_model=APIResponse[HolidayResponse]
)
async def update_holiday(
    holiday_id: UUID,
    req: HolidayUpdate,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_permission(Perms.ACADEMIC_MANAGE))
):
    service = AcademicService(uow)
    try:
        hol = await service.update_holiday(holiday_id, req)
        return APIResponse(success=True, data=HolidayResponse.model_validate(hol))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete(
    "/holidays/{holiday_id}",
    summary="Delete Holiday",
    description="Deletes a holiday. **Requires:** `academic:manage`",
    response_model=APIResponse[dict]
)
async def delete_holiday(
    holiday_id: UUID,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_permission(Perms.ACADEMIC_MANAGE))
):
    service = AcademicService(uow)
    try:
        await service.delete_holiday(holiday_id)
        return APIResponse(success=True, data={"message": "Holiday deleted successfully"})
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
