import secrets
import string
from typing import List, Tuple, Optional
from uuid import UUID
from datetime import datetime, timezone

from app.core.uow import UnitOfWork
from app.models.gate_pass import GatePass, GatePassStatus, GatePassType
from app.models.user import User

from sqlalchemy import select
from app.models.profiles import StudentProfile
from app.schemas.gate_pass import GatePassResponse

class GatePassService:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow

    def _generate_pass_code(self) -> str:
        return ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(6))

    async def _to_response(self, u: UnitOfWork, gp: GatePass) -> GatePassResponse:
        now = datetime.now(timezone.utc)
        if gp.status == GatePassStatus.out and gp.expected_return_at and gp.expected_return_at < now:
            gp.status = GatePassStatus.overdue
            await u.gate_passes.update(gp, {})

        student = await u.users.get_by_id(gp.student_user_id)
        student_name = student.name if student else "Student"
        student_email = student.email if student else "N/A"

        stmt = select(StudentProfile).where(StudentProfile.user_id == gp.student_user_id)
        res = await u.db.execute(stmt)
        prof = res.scalar_one_or_none()

        roll_number = prof.registration_no if prof else None
        hostel_name = "Day Scholar / Unallocated"
        room_number = prof.room_number if (prof and prof.room_number) else "N/A"

        if prof and prof.hostel_id:
            h = await u.hostels.get_by_id(prof.hostel_id)
            if h:
                hostel_name = h.name

        approver_name = None
        if gp.approved_by:
            approver = await u.users.get_by_id(gp.approved_by)
            if approver:
                approver_name = approver.name

        return GatePassResponse(
            id=gp.id,
            student_user_id=gp.student_user_id,
            type=gp.type,
            reason_category=gp.reason_category,
            reason=gp.reason,
            destination=gp.destination,
            out_at=gp.out_at,
            expected_return_at=gp.expected_return_at,
            from_date=gp.from_date,
            to_date=gp.to_date,
            status=gp.status,
            approved_by=gp.approved_by,
            review_note=gp.review_note,
            reviewed_at=gp.reviewed_at,
            pass_code=gp.pass_code,
            actual_out_at=gp.actual_out_at,
            actual_return_at=gp.actual_return_at,
            marked_out_by=gp.marked_out_by,
            marked_in_by=gp.marked_in_by,
            parent_notified=gp.parent_notified,
            student_name=student_name,
            student_email=student_email,
            roll_number=roll_number,
            hostel_name=hostel_name,
            room_number=room_number,
            approver_name=approver_name,
            created_at=gp.created_at,
            updated_at=gp.updated_at
        )

    async def request_gate_pass(self, student_id: UUID, data: dict) -> GatePassResponse:
        async with self.uow.transaction() as u:
            # 1. Verify student profile
            stmt = select(StudentProfile).where(StudentProfile.user_id == student_id)
            res = await u.db.execute(stmt)
            prof = res.scalar_one_or_none()
            if not prof:
                raise ValueError("Only registered students can request gate passes.")

            # 2. Check active passes
            filters = {"student_user_id": student_id}
            existing_passes, _ = await u.gate_passes.list(filters=filters)
            active_statuses = [GatePassStatus.requested, GatePassStatus.approved, GatePassStatus.out, GatePassStatus.overdue]
            for gp in existing_passes:
                if gp.status in active_statuses:
                    raise ValueError(f"You already have an active gate pass (Status: {gp.status.value}).")

            # 3. Date & Time Validation
            now = datetime.now(timezone.utc)
            expected_return = data.get("expected_return_at")
            from_date = data.get("from_date")
            to_date = data.get("to_date")

            if data.get("type") == GatePassType.short and expected_return:
                if expected_return <= now:
                    raise ValueError("Expected return time must be in the future.")
            elif data.get("type") == GatePassType.long and from_date and to_date:
                if to_date < from_date:
                    raise ValueError("End date must be on or after start date.")

            gate_pass = GatePass(
                student_user_id=student_id,
                type=data["type"],
                reason_category=data["reason_category"],
                reason=data.get("reason"),
                destination=data["destination"],
                expected_return_at=expected_return,
                from_date=from_date,
                to_date=to_date,
                status=GatePassStatus.requested
            )
            
            gate_pass = await u.gate_passes.create(gate_pass)
            return await self._to_response(u, gate_pass)

    async def review_gate_pass(self, reviewer_id: UUID, pass_id: UUID, status: GatePassStatus, note: Optional[str] = None) -> GatePassResponse:
        async with self.uow.transaction() as u:
            gate_pass = await u.gate_passes.get_by_id(pass_id)
            if not gate_pass:
                raise ValueError("Gate pass not found.")
                
            if gate_pass.status != GatePassStatus.requested:
                raise ValueError(f"Cannot review gate pass. Current status is {gate_pass.status.value}.")

            if reviewer_id == gate_pass.student_user_id:
                raise ValueError("Self-approval is not permitted.")
                
            gate_pass.status = status
            gate_pass.approved_by = reviewer_id
            gate_pass.review_note = note
            gate_pass.reviewed_at = datetime.now(timezone.utc)
            
            if status == GatePassStatus.approved:
                # Retry loop to guarantee unique pass code
                pass_code = None
                for _ in range(5):
                    candidate = self._generate_pass_code()
                    existing, _ = await u.gate_passes.list(filters={"pass_code": candidate})
                    if not existing:
                        pass_code = candidate
                        break
                if not pass_code:
                    raise ValueError("Could not generate a unique pass code. Please try again.")
                gate_pass.pass_code = pass_code
                
            await u.gate_passes.update(gate_pass, {})
            return await self._to_response(u, gate_pass)

    async def mark_exit(self, security_guard_id: UUID, pass_code: str) -> GatePassResponse:
        async with self.uow.transaction() as u:
            clean_code = pass_code.strip().upper()
            if not clean_code or len(clean_code) != 6:
                raise ValueError("Pass code must be a 6-character code.")

            results, _ = await u.gate_passes.list(filters={"pass_code": clean_code})
            if not results:
                raise ValueError("Invalid or expired pass code.")
                
            gate_pass = results[0]
            if gate_pass.status != GatePassStatus.approved:
                raise ValueError(f"Pass code cannot be marked out. Current status: {gate_pass.status.value}.")

            gate_pass.status = GatePassStatus.out
            gate_pass.actual_out_at = datetime.now(timezone.utc)
            gate_pass.marked_out_by = security_guard_id
            
            await u.gate_passes.update(gate_pass, {})
            return await self._to_response(u, gate_pass)

    async def mark_return(self, security_guard_id: UUID, pass_code: str) -> GatePassResponse:
        async with self.uow.transaction() as u:
            clean_code = pass_code.strip().upper()
            if not clean_code or len(clean_code) != 6:
                raise ValueError("Pass code must be a 6-character code.")

            results, _ = await u.gate_passes.list(filters={"pass_code": clean_code})
            if not results:
                raise ValueError("Invalid pass code.")
                
            gate_pass = results[0]
            if gate_pass.status not in [GatePassStatus.out, GatePassStatus.overdue]:
                raise ValueError(f"Cannot mark return. Current status is {gate_pass.status.value}.")
                
            gate_pass.status = GatePassStatus.returned
            gate_pass.actual_return_at = datetime.now(timezone.utc)
            gate_pass.marked_in_by = security_guard_id
            
            await u.gate_passes.update(gate_pass, {})
            return await self._to_response(u, gate_pass)

    async def get_student_passes(self, student_id: UUID, skip: int = 0, limit: int = 50) -> Tuple[List[GatePassResponse], int]:
        async with self.uow.transaction() as u:
            passes, total = await u.gate_passes.list(filters={"student_user_id": student_id}, skip=skip, limit=limit)
            items = []
            for gp in passes:
                resp = await self._to_response(u, gp)
                items.append(resp)
            return items, total

    async def list_all_passes(self, status_filter: Optional[str] = None, skip: int = 0, limit: int = 50) -> Tuple[List[GatePassResponse], int]:
        async with self.uow.transaction() as u:
            kwargs = {}
            if status_filter:
                st_clean = status_filter.strip().lower()
                matching_enum = None
                for member in GatePassStatus:
                    if member.name.lower() == st_clean or member.value.lower() == st_clean:
                        matching_enum = member
                        break
                if matching_enum:
                    kwargs["status"] = matching_enum

            passes, total = await u.gate_passes.list(filters=kwargs, skip=skip, limit=limit)
            items = []
            for gp in passes:
                resp = await self._to_response(u, gp)
                items.append(resp)
            return items, total
