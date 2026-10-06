from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from uuid import UUID

from app.core.database import get_db
from app.api.deps import require_permission, get_current_user, get_user_permissions
from app.core.permissions import Perms
from app.models.user import User, UserType
from app.models.document import DocumentStatus, DocumentType
from app.services.document_service import DocumentService
from app.schemas.common import APIResponse
from app.schemas.document import (
    DocumentRequestCreate,
    DocumentRequestApprove,
    DocumentRequestReject,
    DocumentRequestMarkReady,
    DocumentRequestResponse,
    DocumentRequestListResponse,
)

router = APIRouter(tags=["Documents"])

# ==========================================
# STUDENT ENDPOINTS
# ==========================================

@router.post(
    "/requests",
    response_model=APIResponse[DocumentRequestResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Submit Document / Certificate Request",
    description="Allows students to apply for bonafide certificates, NOCs, etc. **Requires:** `document:create`"
)
async def create_document_request(
    data: DocumentRequestCreate,
    current_user: User = Depends(require_permission(Perms.DOCUMENT_CREATE)),
    db: AsyncSession = Depends(get_db)
):
    service = DocumentService(db)
    result = await service.create_request(current_user, data)
    return APIResponse(success=True, data=result)

@router.get(
    "/requests/mine",
    response_model=APIResponse[DocumentRequestListResponse],
    summary="List My Document Requests",
    description="Returns all document requests submitted by the logged-in student. **Requires:** `document:view`"
)
async def get_my_document_requests(
    status_filter: Optional[DocumentStatus] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_permission(Perms.DOCUMENT_VIEW)),
    db: AsyncSession = Depends(get_db)
):
    service = DocumentService(db)
    skip = (page - 1) * size
    items, total = await service.get_my_requests(
        current_user=current_user,
        status_filter=status_filter,
        skip=skip,
        limit=size
    )
    return APIResponse(
        success=True,
        data=DocumentRequestListResponse(
            items=items,
            total=total,
            page=page,
            size=size
        )
    )

@router.get(
    "/requests/{id}",
    response_model=APIResponse[DocumentRequestResponse],
    summary="Get Document Request Detail",
    description="Fetch single document request by ID. Students can only view their own. **Requires:** `document:view`"
)
async def get_document_request_by_id(
    id: UUID,
    current_user: User = Depends(require_permission(Perms.DOCUMENT_VIEW)),
    permissions: list[str] = Depends(get_user_permissions),
    db: AsyncSession = Depends(get_db)
):
    is_admin = Perms.DOCUMENT_MANAGE in permissions or current_user.user_type == UserType.admin
    service = DocumentService(db)
    result = await service.get_request_by_id(id, current_user, is_admin=is_admin)
    return APIResponse(success=True, data=result)

@router.get(
    "/requests/{id}/download",
    response_model=APIResponse[dict],
    summary="Download Issued Certificate / Document",
    description="Download certificate file once marked ready. **Requires:** `document:view`"
)
async def download_document(
    id: UUID,
    current_user: User = Depends(require_permission(Perms.DOCUMENT_VIEW)),
    permissions: list[str] = Depends(get_user_permissions),
    db: AsyncSession = Depends(get_db)
):
    is_admin = Perms.DOCUMENT_MANAGE in permissions or current_user.user_type == UserType.admin
    service = DocumentService(db)
    info = await service.get_download_info(id, current_user, is_admin=is_admin)
    return APIResponse(success=True, data=info)

# ==========================================
# ADMIN / MANAGEMENT ENDPOINTS
# ==========================================

admin_router = APIRouter(tags=["Documents (Admin)"])

@admin_router.get(
    "/requests",
    response_model=APIResponse[DocumentRequestListResponse],
    summary="List All Document Requests (Admin)",
    description="View and filter all student document requests across the institution. **Requires:** `document:list`"
)
async def list_all_document_requests(
    status_filter: Optional[DocumentStatus] = Query(None, alias="status"),
    type_filter: Optional[DocumentType] = Query(None, alias="type"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_permission(Perms.DOCUMENT_LIST)),
    db: AsyncSession = Depends(get_db)
):
    service = DocumentService(db)
    skip = (page - 1) * size
    items, total = await service.list_all_requests(
        status_filter=status_filter,
        type_filter=type_filter,
        skip=skip,
        limit=size
    )
    return APIResponse(
        success=True,
        data=DocumentRequestListResponse(
            items=items,
            total=total,
            page=page,
            size=size
        )
    )

@admin_router.patch(
    "/requests/{id}/approve",
    response_model=APIResponse[DocumentRequestResponse],
    summary="Approve Document Request",
    description="Approve a student's document request and optionally attach certificate file. **Requires:** `document:approve`"
)
async def approve_document_request(
    id: UUID,
    data: DocumentRequestApprove,
    current_user: User = Depends(require_permission(Perms.DOCUMENT_APPROVE)),
    db: AsyncSession = Depends(get_db)
):
    service = DocumentService(db)
    result = await service.approve_request(id, current_user, data)
    return APIResponse(success=True, data=result)

@admin_router.patch(
    "/requests/{id}/reject",
    response_model=APIResponse[DocumentRequestResponse],
    summary="Reject Document Request",
    description="Reject a student's document request with mandatory reason. **Requires:** `document:reject`"
)
async def reject_document_request(
    id: UUID,
    data: DocumentRequestReject,
    current_user: User = Depends(require_permission(Perms.DOCUMENT_REJECT)),
    db: AsyncSession = Depends(get_db)
):
    service = DocumentService(db)
    result = await service.reject_request(id, current_user, data)
    return APIResponse(success=True, data=result)

@admin_router.patch(
    "/requests/{id}/ready",
    response_model=APIResponse[DocumentRequestResponse],
    summary="Mark Document as Ready / Issue Certificate",
    description="Provide issued certificate URL and mark request ready for student download. **Requires:** `document:manage`"
)
async def mark_document_ready(
    id: UUID,
    data: DocumentRequestMarkReady,
    current_user: User = Depends(require_permission(Perms.DOCUMENT_MANAGE)),
    db: AsyncSession = Depends(get_db)
):
    service = DocumentService(db)
    result = await service.mark_ready(id, current_user, data)
    return APIResponse(success=True, data=result)
