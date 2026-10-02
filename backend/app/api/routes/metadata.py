from fastapi import APIRouter, Depends
from app.schemas.common import APIResponse
from app.api.deps import get_metadata_service
from app.services.metadata_service import MetadataService

router = APIRouter(tags=["Metadata"])

@router.get(
    "/settings/public",
    summary="Get Public System Settings",
    description="Returns all system settings that are marked as public (e.g., password rules, site name).",
    response_model=APIResponse
)
async def get_public_settings(service: MetadataService = Depends(get_metadata_service)):
    data = await service.get_public_settings()
    return APIResponse(success=True, data=data, error=None)

@router.get(
    "/courses", 
    summary="Get Courses Metadata", 
    description="Returns a list of all active courses.",
    response_model=APIResponse
)
async def get_courses(service: MetadataService = Depends(get_metadata_service)):
    courses = await service.get_active_courses()
    data = [
        {
            "id": str(course.id), 
            "name": course.name,
            "is_active": course.is_active,
            "duration_years": course.duration_years
        } 
        for course in courses
    ]
    return APIResponse(success=True, data=data, error=None)

@router.get(
    "/departments", 
    summary="Get Departments Metadata", 
    description="Returns a list of all active departments.",
    response_model=APIResponse
)
async def get_departments(service: MetadataService = Depends(get_metadata_service)):
    departments = await service.get_active_departments()
    data = [
        {
            "id": str(d.id), 
            "name": d.name, 
            "code": d.code, 
            "department_type": d.department_type,
            "is_active": d.is_active,
            "hod_user_id": str(d.hod_user_id) if d.hod_user_id else None
        } 
        for d in departments
    ]
    return APIResponse(success=True, data=data, error=None)

@router.get(
    "/hierarchy",
    summary="Get Faculty Hierarchy Tree",
    description="Returns the nested folder structure of Courses -> Departments -> Faculty.",
    response_model=APIResponse
)
async def get_hierarchy(service: MetadataService = Depends(get_metadata_service)):
    data = await service.get_hierarchy()
    return APIResponse(success=True, data=data, error=None)

@router.get(
    "/roles",
    summary="Get Roles Metadata",
    description="Returns a lightweight list of roles for dropdowns.",
    response_model=APIResponse
)
async def get_roles(service: MetadataService = Depends(get_metadata_service)):
    data = await service.get_roles()
    return APIResponse(success=True, data=data, error=None)
