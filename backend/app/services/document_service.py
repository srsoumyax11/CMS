import secrets
import string
from typing import List, Tuple, Dict, Any, Optional
from uuid import UUID
from datetime import datetime, timezone

from app.core.uow import UnitOfWork
from app.models.documents import DocumentType, DocumentRequest, DocumentApproval, DocumentRequestStatus
from app.schemas.document import (
    DocumentTypeCreate,
    DocumentTypeUpdate,
    DocumentRequestCreate,
    DocumentApprovalSubmit,
    DocumentVerifyResponse
)

def generate_verify_code(prefix: str = "DOC") -> str:
    alphabet = string.ascii_uppercase + string.digits
    random_str = ''.join(secrets.choice(alphabet) for _ in range(10))
    return f"{prefix}-{datetime.now().year}-{random_str}"

class DocumentService:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow

    async def create_document_type(self, type_in: DocumentTypeCreate) -> DocumentType:
        async with self.uow.transaction() as u:
            existing = await u.document_types.get_by_code(type_in.code)
            if existing:
                raise ValueError(f"Document type with code '{type_in.code}' already exists.")

            doc_type = DocumentType(
                code=type_in.code.upper(),
                name=type_in.name,
                description=type_in.description,
                template_file_url=type_in.template_file_url,
                fields_schema=type_in.fields_schema,
                approval_steps=type_in.approval_steps or [],
                fee=type_in.fee,
                status=type_in.status
            )
            return await u.document_types.create(doc_type)

    async def update_document_type(self, type_id: UUID, type_in: DocumentTypeUpdate) -> DocumentType:
        async with self.uow.transaction() as u:
            doc_type = await u.document_types.get_by_id(type_id)
            if not doc_type:
                raise ValueError("Document type not found.")

            update_data = type_in.model_dump(exclude_unset=True)
            return await u.document_types.update(doc_type, update_data)

    async def list_document_types(self, active_only: bool = True, skip: int = 0, limit: int = 100) -> Tuple[List[DocumentType], int]:
        filters = {}
        if active_only:
            filters["status"] = True
        async with self.uow.transaction() as u:
            return await u.document_types.list(filters=filters, skip=skip, limit=limit)

    async def apply_for_document(self, user_id: UUID, req_in: DocumentRequestCreate) -> DocumentRequest:
        async with self.uow.transaction() as u:
            doc_type = await u.document_types.get_by_id(req_in.type_id)
            if not doc_type or not doc_type.status:
                raise ValueError("Document type not available or inactive.")

            doc_req = DocumentRequest(
                type_id=req_in.type_id,
                user_id=user_id,
                form_data=req_in.form_data or {},
                status=DocumentRequestStatus.submitted,
                current_step=1
            )
            return await u.document_requests.create(doc_req)

    async def review_approval(self, approver_id: UUID, request_id: UUID, submit_in: DocumentApprovalSubmit) -> DocumentRequest:
        decision_clean = submit_in.decision.upper()
        if decision_clean not in ["APPROVED", "REJECTED", "REVISION"]:
            raise ValueError("Decision must be APPROVED, REJECTED, or REVISION.")

        async with self.uow.transaction() as u:
            doc_req = await u.document_requests.get_by_id(request_id)
            if not doc_req:
                raise ValueError("Document request not found.")

            if doc_req.status in [DocumentRequestStatus.approved, DocumentRequestStatus.rejected, DocumentRequestStatus.issued]:
                raise ValueError(f"Document request is already finalized with status '{doc_req.status}'.")

            doc_type = await u.document_types.get_by_id(doc_req.type_id)
            steps = doc_type.approval_steps if (doc_type and doc_type.approval_steps) else []

            # Log approval record
            approval_entry = DocumentApproval(
                request_id=request_id,
                step_no=doc_req.current_step,
                approver_user_id=approver_id,
                decision=decision_clean,
                note=submit_in.note,
                decided_at=datetime.now(timezone.utc)
            )
            await u.document_approvals.create(approval_entry)

            # Update request status based on decision
            if decision_clean == "REJECTED":
                doc_req.status = DocumentRequestStatus.rejected
            elif decision_clean == "REVISION":
                doc_req.status = DocumentRequestStatus.needs_revision
            elif decision_clean == "APPROVED":
                total_steps = len(steps)
                if total_steps > 0 and doc_req.current_step < total_steps:
                    doc_req.current_step += 1
                    doc_req.status = DocumentRequestStatus.in_review
                else:
                    # Final approval step passed -> Issue document
                    doc_req.status = DocumentRequestStatus.issued
                    doc_req.verify_code = generate_verify_code(doc_type.code if doc_type else "DOC")
                    doc_req.issued_at = datetime.now(timezone.utc)

            await u.document_requests.update(doc_req, {})
            return doc_req

    async def verify_document(self, verify_code: str) -> DocumentVerifyResponse:
        async with self.uow.transaction() as u:
            doc_req = await u.document_requests.get_by_verify_code(verify_code)
            if not doc_req:
                return DocumentVerifyResponse(
                    valid=False,
                    message="Invalid verification code. Document not found."
                )

            doc_type = await u.document_types.get_by_id(doc_req.type_id)
            return DocumentVerifyResponse(
                valid=True,
                message="Document verification successful. Document is authentic.",
                request_id=doc_req.id,
                user_id=doc_req.user_id,
                document_type_code=doc_type.code if doc_type else None,
                issued_at=doc_req.issued_at,
                verify_code=doc_req.verify_code
            )

    async def get_user_requests(self, user_id: UUID, skip: int = 0, limit: int = 100) -> Tuple[List[DocumentRequest], int]:
        async with self.uow.transaction() as u:
            return await u.document_requests.get_user_requests(user_id, skip=skip, limit=limit)
