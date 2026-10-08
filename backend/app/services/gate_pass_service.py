import random
import string
from typing import List, Tuple, Optional
from uuid import UUID
from datetime import datetime, timezone

from app.core.uow import UnitOfWork
from app.models.gate_pass import GatePass, GatePassStatus
from app.models.user import User

class GatePassService:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow

    def _generate_pass_code(self) -> str:
        return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

    async def request_gate_pass(self, student_id: UUID, data: dict) -> GatePass:
        async with self.uow.transaction() as u:
            # Check if there's already an active gate pass
            filters = {"student_user_id": student_id}
            # Simplified check: we could fetch list and check status in Python for now
            existing_passes, _ = await u.gate_passes.list(filters=filters)
            active_statuses = [GatePassStatus.requested, GatePassStatus.approved, GatePassStatus.out, GatePassStatus.overdue]
            for gp in existing_passes:
                if gp.status in active_statuses:
                    raise ValueError(f"You already have an active gate pass (Status: {gp.status.value}).")

            gate_pass = GatePass(
                student_user_id=student_id,
                type=data["type"],
                reason_category=data["reason_category"],
                reason=data.get("reason"),
                destination=data["destination"],
                expected_return_at=data.get("expected_return_at"),
                from_date=data.get("from_date"),
                to_date=data.get("to_date"),
                status=GatePassStatus.requested
            )
            
            gate_pass = await u.gate_passes.create(gate_pass)
            return gate_pass

    async def review_gate_pass(self, reviewer_id: UUID, pass_id: UUID, status: GatePassStatus, note: Optional[str] = None) -> GatePass:
        async with self.uow.transaction() as u:
            gate_pass = await u.gate_passes.get_by_id(pass_id)
            if not gate_pass:
                raise ValueError("Gate pass not found.")
                
            if gate_pass.status != GatePassStatus.requested:
                raise ValueError(f"Cannot review gate pass. Current status is {gate_pass.status.value}.")
                
            gate_pass.status = status
            gate_pass.approved_by = reviewer_id
            gate_pass.review_note = note
            gate_pass.reviewed_at = datetime.now(timezone.utc)
            
            if status == GatePassStatus.approved:
                gate_pass.pass_code = self._generate_pass_code()
                
            await u.gate_passes.update(gate_pass, {})
            return gate_pass

    async def mark_exit(self, security_guard_id: UUID, pass_code: str) -> GatePass:
        async with self.uow.transaction() as u:
            results, _ = await u.gate_passes.list(filters={"pass_code": pass_code, "status": GatePassStatus.approved})
            if not results:
                raise ValueError("Invalid or expired pass code.")
                
            gate_pass = results[0]
            gate_pass.status = GatePassStatus.out
            gate_pass.actual_out_at = datetime.now(timezone.utc)
            gate_pass.marked_out_by = security_guard_id
            
            await u.gate_passes.update(gate_pass, {})
            return gate_pass

    async def mark_return(self, security_guard_id: UUID, pass_code: str) -> GatePass:
        async with self.uow.transaction() as u:
            results, _ = await u.gate_passes.list(filters={"pass_code": pass_code})
            if not results:
                raise ValueError("Invalid pass code.")
                
            gate_pass = results[0]
            if gate_pass.status not in [GatePassStatus.out, GatePassStatus.overdue]:
                raise ValueError(f"Cannot mark return. Current status is {gate_pass.status.value}.")
                
            gate_pass.status = GatePassStatus.returned
            gate_pass.actual_return_at = datetime.now(timezone.utc)
            gate_pass.marked_in_by = security_guard_id
            
            await u.gate_passes.update(gate_pass, {})
            return gate_pass

    async def get_student_passes(self, student_id: UUID, skip: int = 0, limit: int = 50) -> Tuple[List[GatePass], int]:
        async with self.uow.transaction() as u:
            passes, total = await u.gate_passes.list(filters={"student_user_id": student_id}, skip=skip, limit=limit)
            return passes, total

    async def list_all_passes(self, skip: int = 0, limit: int = 50) -> Tuple[List[GatePass], int]:
        async with self.uow.transaction() as u:
            passes, total = await u.gate_passes.list(skip=skip, limit=limit)
            return passes, total
