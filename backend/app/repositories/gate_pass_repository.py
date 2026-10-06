from typing import Optional, List, Tuple
from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy import select, or_, and_, desc, func
from sqlalchemy.orm import joinedload, selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.gate_pass import QuickGatePass, GatePassStatus
from app.models.user import User
from app.models.profiles import StudentProfile
from app.repositories.base_repository import GenericRepository

class GatePassRepository(GenericRepository[QuickGatePass]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, QuickGatePass)

    async def get_active_pass_by_student(self, student_id: UUID) -> Optional[QuickGatePass]:
        stmt = select(QuickGatePass).options(
            joinedload(QuickGatePass.student).joinedload(User.student_profile)
        ).where(
            QuickGatePass.student_id == student_id,
            QuickGatePass.status.in_([GatePassStatus.checked_out, GatePassStatus.overdue])
        ).order_by(desc(QuickGatePass.created_at))
        
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def get_by_pass_code(self, pass_code: str) -> Optional[QuickGatePass]:
        stmt = select(QuickGatePass).options(
            joinedload(QuickGatePass.student).joinedload(User.student_profile)
        ).where(QuickGatePass.pass_code == pass_code)
        
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def get_active_by_roll_number(self, roll_number: str) -> Optional[QuickGatePass]:
        term = roll_number.strip().lower()
        stmt = select(QuickGatePass).join(
            User, QuickGatePass.student_id == User.id
        ).options(
            joinedload(QuickGatePass.student).joinedload(User.student_profile)
        ).where(
            or_(
                func.lower(User.email).like(f"{term}%"),
                func.lower(User.name) == term
            ),
            QuickGatePass.status.in_([GatePassStatus.checked_out, GatePassStatus.overdue])
        ).order_by(desc(QuickGatePass.created_at))
        
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def list_by_student(self, student_id: UUID, skip: int = 0, limit: int = 50) -> Tuple[List[QuickGatePass], int]:
        count_stmt = select(func.count()).where(QuickGatePass.student_id == student_id)
        total = await self.db.scalar(count_stmt) or 0

        stmt = select(QuickGatePass).options(
            joinedload(QuickGatePass.student).joinedload(User.student_profile)
        ).where(
            QuickGatePass.student_id == student_id
        ).order_by(desc(QuickGatePass.created_at)).offset(skip).limit(limit)
        
        result = await self.db.execute(stmt)
        items = list(result.scalars().all())
        return items, total

    async def list_all_active(self, skip: int = 0, limit: int = 50) -> Tuple[List[QuickGatePass], int]:
        count_stmt = select(func.count()).where(
            QuickGatePass.status.in_([GatePassStatus.checked_out, GatePassStatus.overdue])
        )
        total = await self.db.scalar(count_stmt) or 0

        stmt = select(QuickGatePass).options(
            joinedload(QuickGatePass.student).joinedload(User.student_profile)
        ).where(
            QuickGatePass.status.in_([GatePassStatus.checked_out, GatePassStatus.overdue])
        ).order_by(desc(QuickGatePass.expected_return_time)).offset(skip).limit(limit)
        
        result = await self.db.execute(stmt)
        items = list(result.scalars().all())
        return items, total

