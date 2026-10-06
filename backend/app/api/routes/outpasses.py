from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from uuid import UUID
from typing import Optional

from app.models.user import User
from app.models.outpass import OutpassStatus
from app.schemas.outpass import OutpassCreateRequest, OutpassResponse, OutpassListResponse, OutpassRejectRequest, OutpassApprovalActionResponse
from app.schemas.common import APIResponse
from app.api.deps import require_permission, get_user_permissions, can_view_outpass, get_outpass_service, get_department_scope
from app.api.middleware import verify_ownership
from app.core.permissions import Perms
from app.services.outpass_service import OutpassService

router = APIRouter(tags=["Outpasses"])

@router.post(
    "", 
    summary="Request Outpass", 
    description="Creates a new outpass request. Overlap validation prevents concurrent outpasses. **Requires:** `outpass:create`",
    response_model=APIResponse[OutpassResponse]
)
async def create_outpass(
    request: OutpassCreateRequest,
    service: OutpassService = Depends(get_outpass_service),
    current_user: User = Depends(require_permission(Perms.OUTPASS_CREATE))
):
    try:
        async with service.uow.transaction():
            outpass = await service.request_outpass(request, current_user)
            return APIResponse(success=True, data=OutpassResponse.model_validate(outpass))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get(
    "/mine", 
    summary="List My Outpasses", 
    description="Fetches all outpasses requested by the current student user. **Requires:** `outpass:view`",
    response_model=APIResponse[OutpassListResponse]
)
async def list_my_outpasses(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    service: OutpassService = Depends(get_outpass_service),
    current_user: User = Depends(require_permission(Perms.OUTPASS_VIEW))
):
    items, total = await service.list_my_outpasses(current_user, skip, limit)
    
    response_data = OutpassListResponse(
        total=total,
        items=[OutpassResponse.model_validate(i) for i in items]
    )
    return APIResponse(success=True, data=response_data)


@router.get(
    "", 
    summary="List All Outpasses (Admin/Faculty)", 
    description="Fetches outpasses across the system. Supports filtering by status, department, and dynamic overdue status. **Requires:** `outpass:list`",
    response_model=APIResponse[OutpassListResponse]
)
async def list_outpasses(
    status: Optional[OutpassStatus] = None,
    is_overdue: Optional[bool] = None,
    department_id: Optional[UUID] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    service: OutpassService = Depends(get_outpass_service),
    scope_dept_id: Optional[UUID] = Depends(get_department_scope),
    _ = Depends(require_permission(Perms.OUTPASS_LIST))
):
    effective_dept_id = scope_dept_id if scope_dept_id is not None else department_id
    items, total = await service.list_all_outpasses(
        status=status, 
        is_overdue=is_overdue, 
        department_id=effective_dept_id, 
        skip=skip, 
        limit=limit
    )
    
    response_data = OutpassListResponse(
        total=total,
        items=[OutpassResponse.model_validate(i) for i in items]
    )
    return APIResponse(success=True, data=response_data)


@router.get(
    "/{id}", 
    summary="Get Outpass Detail", 
    description="Fetches details for a specific outpass. Protected by explicit row-level IDOR checks. **Requires:** `outpass:view`",
    response_model=APIResponse[OutpassResponse]
)
@verify_ownership(resource_name="outpass")
async def get_outpass(
    id: UUID,
    service: OutpassService = Depends(get_outpass_service),
    current_user: User = Depends(require_permission(Perms.OUTPASS_VIEW)),
    permissions: set[str] = Depends(get_user_permissions)
):
    outpass = await service.get_outpass(id)
    
    if not outpass:
        raise HTTPException(status_code=404, detail="Outpass not found")
        
    return APIResponse(success=True, data=OutpassResponse.model_validate(outpass))


@router.patch(
    "/{id}/cancel", 
    summary="Cancel Outpass", 
    description="Cancels an outpass request. Protected by explicit row-level IDOR checks. **Requires:** `outpass:cancel`",
    response_model=APIResponse[OutpassResponse]
)
async def cancel_outpass(
    id: UUID,
    service: OutpassService = Depends(get_outpass_service),
    current_user: User = Depends(require_permission(Perms.OUTPASS_CANCEL))
):
    outpass = await service.get_outpass(id)
    if not outpass:
        raise HTTPException(status_code=404, detail="Outpass not found")

    try:
        async with service.uow.transaction():
            updated = await service.cancel_outpass(outpass, current_user)
            return APIResponse(success=True, data=OutpassResponse.model_validate(updated))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.patch(
    "/{id}/approve", 
    summary="Approve Outpass", 
    description="Transitions a pending outpass to approved status. Logs the transition transactionally. Enforces department scoping. **Requires:** `outpass:approve`",
    response_model=OutpassApprovalActionResponse
)
async def approve_outpass(
    id: UUID,
    background_tasks: BackgroundTasks,
    service: OutpassService = Depends(get_outpass_service),
    scope_dept_id: Optional[UUID] = Depends(get_department_scope),
    current_user: User = Depends(require_permission(Perms.OUTPASS_APPROVE))
):
    outpass = await service.get_outpass_with_student(id)
    if not outpass:
        raise HTTPException(status_code=404, detail="Outpass not found")
        
    try:
        async with service.uow.transaction():
            updated = await service.approve_outpass(outpass, current_user, background_tasks, scope_dept_id=scope_dept_id)
            return OutpassApprovalActionResponse(success=True, data=OutpassResponse.model_validate(updated))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.patch(
    "/{id}/reject", 
    summary="Reject Outpass", 
    description="Rejects an outpass. Includes an optional rejection note. Enforces department scoping. **Requires:** `outpass:approve`",
    response_model=OutpassApprovalActionResponse
)
async def reject_outpass(
    id: UUID,
    request: OutpassRejectRequest,
    background_tasks: BackgroundTasks,
    service: OutpassService = Depends(get_outpass_service),
    scope_dept_id: Optional[UUID] = Depends(get_department_scope),
    current_user: User = Depends(require_permission(Perms.OUTPASS_APPROVE))
):
    outpass = await service.get_outpass_with_student(id)
    if not outpass:
        raise HTTPException(status_code=404, detail="Outpass not found")
        
    try:
        async with service.uow.transaction():
            updated = await service.reject_outpass(outpass, request, current_user, background_tasks, scope_dept_id=scope_dept_id)
            return OutpassApprovalActionResponse(success=True, data=OutpassResponse.model_validate(updated))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.patch(
    "/{id}/depart", 
    summary="Mark Outpass Departed", 
    description="Transitions an approved outpass to active status when the student leaves the gate. **Requires:** `outpass:approve`",
    response_model=OutpassApprovalActionResponse
)
async def depart_outpass(
    id: UUID,
    service: OutpassService = Depends(get_outpass_service),
    current_user: User = Depends(require_permission(Perms.OUTPASS_APPROVE))
):
    outpass = await service.get_outpass_with_student(id)
    if not outpass:
        raise HTTPException(status_code=404, detail="Outpass not found")
        
    try:
        async with service.uow.transaction():
            updated = await service.depart_outpass(outpass, current_user)
            return OutpassApprovalActionResponse(success=True, data=OutpassResponse.model_validate(updated))
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.patch(
    "/{id}/return", 
    summary="Mark Outpass Returned", 
    description="Transitions an active outpass to completed status when the student returns. Updates actual_return_time. **Requires:** `outpass:approve`",
    response_model=OutpassApprovalActionResponse
)
async def return_outpass(
    id: UUID,
    service: OutpassService = Depends(get_outpass_service),
    current_user: User = Depends(require_permission(Perms.OUTPASS_APPROVE))
):
    outpass = await service.get_outpass_with_student(id)
    if not outpass:
        raise HTTPException(status_code=404, detail="Outpass not found")
        
    try:
        async with service.uow.transaction():
            updated = await service.return_outpass(outpass, current_user)
            return OutpassApprovalActionResponse(success=True, data=OutpassResponse.model_validate(updated))
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post(
    "/trigger-overdue",
    summary="Trigger Overdue Checks for Active Outpasses",
    description="System endpoint to check and flag active outpasses that have passed their expected return time. **Requires:** `outpass:approve`",
    response_model=APIResponse[dict]
)
async def trigger_outpass_overdue_checks(
    background_tasks: BackgroundTasks,
    service: OutpassService = Depends(get_outpass_service),
    current_user: User = Depends(require_permission(Perms.OUTPASS_APPROVE))
):
    async with service.uow.transaction():
        count = await service.trigger_overdue_checks(background_tasks)
        return APIResponse(success=True, data={"overdue_flagged_count": count})

