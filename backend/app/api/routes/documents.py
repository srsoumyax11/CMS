from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from uuid import UUID

from app.core.uow import UnitOfWork
from app.api.deps import get_uow, get_current_user, require_permission
from app.models.user import User
from app.core.permissions import Perms
from app.schemas.common import APIResponse
from app.schemas.document import (
    DocumentTypeCreate,
    DocumentTypeUpdate,
    DocumentTypeResponse,
    DocumentTypeListResponse,
    DocumentRequestCreate,
    DocumentRequestResponse,
    DocumentRequestListResponse,
    DocumentApprovalSubmit,
    DocumentVerifyResponse
)
from app.services.document_service import DocumentService

router = APIRouter(tags=["Documents"])

@router.post(
    "/types",
    summary="Create Document Type Definition",
    description="Creates a new document type with template configuration and approval steps. **Requires:** `document:manage`",
    response_model=APIResponse[DocumentTypeResponse]
)
async def create_document_type(
    req: DocumentTypeCreate,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_permission(Perms.DOCUMENT_MANAGE))
):
    service = DocumentService(uow)
    try:
        doc_type = await service.create_document_type(req)
        return APIResponse(success=True, data=DocumentTypeResponse.model_validate(doc_type))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get(
    "/types",
    summary="List Document Types",
    description="Lists document types available for request. **Requires:** `document:view`",
    response_model=APIResponse[DocumentTypeListResponse]
)
async def list_document_types(
    active_only: bool = Query(True),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(get_current_user)
):
    service = DocumentService(uow)
    items_raw, total = await service.list_document_types(active_only=active_only, skip=skip, limit=limit)
    items = [DocumentTypeResponse.model_validate(item) for item in items_raw]
    return APIResponse(success=True, data=DocumentTypeListResponse(total=total, items=items))

@router.post(
    "/requests",
    summary="Apply for Document",
    description="Submits a request for a document. **Requires:** `document:apply`",
    response_model=APIResponse[DocumentRequestResponse]
)
async def apply_for_document(
    req: DocumentRequestCreate,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_permission(Perms.DOCUMENT_APPLY))
):
    service = DocumentService(uow)
    try:
        doc_req = await service.apply_for_document(current_user.id, req)
        return APIResponse(success=True, data=DocumentRequestResponse.model_validate(doc_req))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get(
    "/requests/mine",
    summary="Get My Document Requests",
    description="Fetches document requests submitted by the authenticated user.",
    response_model=APIResponse[DocumentRequestListResponse]
)
async def get_my_document_requests(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(get_current_user)
):
    service = DocumentService(uow)
    items_raw, total = await service.get_user_requests(current_user.id, skip=skip, limit=limit)
    items = [DocumentRequestResponse.model_validate(item) for item in items_raw]
    return APIResponse(success=True, data=DocumentRequestListResponse(total=total, items=items))

@router.post(
    "/requests/{request_id}/review",
    summary="Review Document Approval Step",
    description="Submits an approval decision (APPROVED, REJECTED, REVISION) for a document request. **Requires:** `document:approve`",
    response_model=APIResponse[DocumentRequestResponse]
)
async def review_document_approval(
    request_id: UUID,
    req: DocumentApprovalSubmit,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_permission(Perms.DOCUMENT_APPROVE))
):
    service = DocumentService(uow)
    try:
        doc_req = await service.review_approval(current_user.id, request_id, req)
        return APIResponse(success=True, data=DocumentRequestResponse.model_validate(doc_req))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get(
    "/verify/{verify_code}",
    summary="Verify Issued Document Code",
    description="Public endpoint to verify the authenticity of an issued document using its unique verification code.",
    response_model=APIResponse[DocumentVerifyResponse]
)
async def verify_document_code(
    verify_code: str,
    uow: UnitOfWork = Depends(get_uow)
):
    service = DocumentService(uow)
    res = await service.verify_document(verify_code)
    return APIResponse(success=True, data=res)
