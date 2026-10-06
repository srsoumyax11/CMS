from typing import Optional, List, Tuple
from uuid import UUID
from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.document_repository import DocumentRepository
from app.models.document import DocumentRequest, DocumentStatusLog, DocumentStatus, DocumentType
from app.models.user import User
from app.schemas.document import (
    DocumentRequestCreate,
    DocumentRequestApprove,
    DocumentRequestReject,
    DocumentRequestMarkReady,
    DocumentRequestResponse,
    DocumentStatusLogResponse,
)

class DocumentService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = DocumentRepository(db)

    def _map_to_response(self, req: DocumentRequest) -> DocumentRequestResponse:
        student_name = req.student.name if req.student else None
        student_email = req.student.email if req.student else None
        processor_name = req.processor.name if req.processor else None

        logs = []
        if req.status_logs:
            for l in req.status_logs:
                changer_name = l.changer.name if l.changer else None
                logs.append(
                    DocumentStatusLogResponse(
                        id=l.id,
                        request_id=l.request_id,
                        old_status=l.old_status,
                        new_status=l.new_status,
                        changed_by=l.changed_by,
                        changer_name=changer_name,
                        remarks=l.remarks,
                        created_at=l.created_at,
                    )
                )

        return DocumentRequestResponse(
            id=req.id,
            student_id=req.student_id,
            student_name=student_name,
            student_email=student_email,
            document_type=req.document_type,
            purpose=req.purpose,
            status=req.status,
            urgency=req.urgency,
            attachment_url=req.attachment_url,
            issued_file_url=req.issued_file_url,
            processed_by=req.processed_by,
            processor_name=processor_name,
            processed_at=req.processed_at,
            rejection_reason=req.rejection_reason,
            admin_notes=req.admin_notes,
            created_at=req.created_at,
            updated_at=req.updated_at,
            status_logs=logs,
        )

    async def create_request(self, current_user: User, data: DocumentRequestCreate) -> DocumentRequestResponse:
        pending_count = await self.repo.count_active_pending_requests(current_user.id)
        if pending_count >= 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You have 3 active pending document requests. Please wait until they are processed before submitting another."
            )

        new_req = DocumentRequest(
            student_id=current_user.id,
            document_type=data.document_type,
            purpose=data.purpose.strip(),
            urgency=data.urgency,
            attachment_url=data.attachment_url,
            status=DocumentStatus.pending,
        )
        created = await self.repo.create(new_req)

        # Log creation
        log = DocumentStatusLog(
            request_id=created.id,
            old_status=None,
            new_status=DocumentStatus.pending.value,
            changed_by=current_user.id,
            remarks="Document request submitted by student"
        )
        await self.repo.add_status_log(log)
        await self.db.commit()

        loaded = await self.repo.get_with_details(created.id)
        return self._map_to_response(loaded or created)

    async def get_my_requests(
        self,
        current_user: User,
        status_filter: Optional[DocumentStatus] = None,
        skip: int = 0,
        limit: int = 50
    ) -> Tuple[List[DocumentRequestResponse], int]:
        items, total = await self.repo.get_student_requests(
            student_id=current_user.id,
            status=status_filter,
            skip=skip,
            limit=limit
        )
        return [self._map_to_response(item) for item in items], total

    async def get_request_by_id(self, request_id: UUID, current_user: User, is_admin: bool = False) -> DocumentRequestResponse:
        req = await self.repo.get_with_details(request_id)
        if not req:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document request not found"
            )
        if not is_admin and req.student_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to view this document request"
            )
        return self._map_to_response(req)

    async def list_all_requests(
        self,
        status_filter: Optional[DocumentStatus] = None,
        type_filter: Optional[DocumentType] = None,
        skip: int = 0,
        limit: int = 50
    ) -> Tuple[List[DocumentRequestResponse], int]:
        items, total = await self.repo.get_all_requests(
            status=status_filter,
            document_type=type_filter,
            skip=skip,
            limit=limit
        )
        return [self._map_to_response(item) for item in items], total

    async def approve_request(
        self,
        request_id: UUID,
        current_user: User,
        data: DocumentRequestApprove
    ) -> DocumentRequestResponse:
        req = await self.repo.get_with_details(request_id)
        if not req:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document request not found"
            )
        if req.status not in (DocumentStatus.pending, DocumentStatus.approved):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot approve a request with status '{req.status.value}'"
            )

        old_status = req.status.value
        # If certificate URL is attached at approval time, transition to ready directly
        next_status = DocumentStatus.ready if data.issued_file_url else DocumentStatus.approved
        
        req.status = next_status
        req.processed_by = current_user.id
        req.processed_at = datetime.now(timezone.utc)
        if data.issued_file_url:
            req.issued_file_url = data.issued_file_url
        if data.admin_notes:
            req.admin_notes = data.admin_notes

        log = DocumentStatusLog(
            request_id=req.id,
            old_status=old_status,
            new_status=next_status.value,
            changed_by=current_user.id,
            remarks=data.admin_notes or f"Approved by admin ({'certificate attached' if data.issued_file_url else 'pending issuance'})"
        )
        await self.repo.add_status_log(log)
        await self.db.commit()

        updated = await self.repo.get_with_details(req.id)
        return self._map_to_response(updated or req)

    async def reject_request(
        self,
        request_id: UUID,
        current_user: User,
        data: DocumentRequestReject
    ) -> DocumentRequestResponse:
        req = await self.repo.get_with_details(request_id)
        if not req:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document request not found"
            )
        if req.status != DocumentStatus.pending:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot reject a request with status '{req.status.value}'. Only pending requests can be rejected."
            )

        old_status = req.status.value
        req.status = DocumentStatus.rejected
        req.rejection_reason = data.rejection_reason.strip()
        req.processed_by = current_user.id
        req.processed_at = datetime.now(timezone.utc)
        if data.admin_notes:
            req.admin_notes = data.admin_notes

        log = DocumentStatusLog(
            request_id=req.id,
            old_status=old_status,
            new_status=DocumentStatus.rejected.value,
            changed_by=current_user.id,
            remarks=f"Rejected: {data.rejection_reason.strip()}"
        )
        await self.repo.add_status_log(log)
        await self.db.commit()

        updated = await self.repo.get_with_details(req.id)
        return self._map_to_response(updated or req)

    async def mark_ready(
        self,
        request_id: UUID,
        current_user: User,
        data: DocumentRequestMarkReady
    ) -> DocumentRequestResponse:
        req = await self.repo.get_with_details(request_id)
        if not req:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document request not found"
            )
        if req.status not in (DocumentStatus.pending, DocumentStatus.approved):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot mark ready a request with status '{req.status.value}'"
            )

        old_status = req.status.value
        req.status = DocumentStatus.ready
        req.issued_file_url = data.issued_file_url.strip()
        req.processed_by = current_user.id
        req.processed_at = datetime.now(timezone.utc)
        if data.admin_notes:
            req.admin_notes = data.admin_notes

        log = DocumentStatusLog(
            request_id=req.id,
            old_status=old_status,
            new_status=DocumentStatus.ready.value,
            changed_by=current_user.id,
            remarks=f"Certificate issued and marked ready. URL: {data.issued_file_url.strip()}"
        )
        await self.repo.add_status_log(log)
        await self.db.commit()

        updated = await self.repo.get_with_details(req.id)
        return self._map_to_response(updated or req)

    async def get_download_info(self, request_id: UUID, current_user: User, is_admin: bool = False) -> dict:
        req = await self.repo.get_with_details(request_id)
        if not req:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document request not found"
            )
        if not is_admin and req.student_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to download this document"
            )
        if req.status != DocumentStatus.ready or not req.issued_file_url:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Document is not ready for download yet"
            )
        return {
            "request_id": req.id,
            "document_type": req.document_type.value,
            "issued_file_url": req.issued_file_url,
            "processed_at": req.processed_at
        }
