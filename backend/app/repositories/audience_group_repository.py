from typing import List, Tuple, Optional, Any
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, delete
from sqlalchemy.orm import selectinload
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.repositories.base_repository import GenericRepository
from app.models.audience_group import AudienceGroup, AudienceGroupMember
from app.models.user import User, UserType, AccountStatus
from app.models.profiles import StudentProfile, FacultyProfile
from app.schemas.audience_group import AudienceFilterRules

class AudienceGroupRepository(GenericRepository[AudienceGroup]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, AudienceGroup)

    async def get_by_name(self, name: str) -> Optional[AudienceGroup]:
        stmt = select(AudienceGroup).where(func.lower(AudienceGroup.name) == func.lower(name))
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def get_with_relations(self, group_id: UUID) -> Optional[Tuple[AudienceGroup, int]]:
        stmt = (
            select(
                AudienceGroup,
                func.count(AudienceGroupMember.id).label("member_count")
            )
            .outerjoin(AudienceGroupMember, AudienceGroup.id == AudienceGroupMember.group_id)
            .options(
                selectinload(AudienceGroup.created_by),
                selectinload(AudienceGroup.filter_course),
                selectinload(AudienceGroup.filter_department)
            )
            .where(AudienceGroup.id == group_id)
            .group_by(AudienceGroup.id)
        )
        res = await self.db.execute(stmt)
        row = res.first()
        if not row:
            return None
        return row[0], row[1]

    async def list_groups_with_counts(self, skip: int = 0, limit: int = 100) -> List[Tuple[AudienceGroup, int]]:
        stmt = (
            select(
                AudienceGroup,
                func.count(AudienceGroupMember.id).label("member_count")
            )
            .outerjoin(AudienceGroupMember, AudienceGroup.id == AudienceGroupMember.group_id)
            .options(
                selectinload(AudienceGroup.created_by),
                selectinload(AudienceGroup.filter_course),
                selectinload(AudienceGroup.filter_department)
            )
            .group_by(AudienceGroup.id)
            .order_by(AudienceGroup.name.asc())
            .offset(skip)
            .limit(limit)
        )
        res = await self.db.execute(stmt)
        return res.all()

    async def evaluate_filter_users(self, filter_rules: Optional[AudienceFilterRules]) -> List[UUID]:
        if not filter_rules:
            return []

        user_types_str = filter_rules.user_types.lower() if filter_rules.user_types else None
        target_types = [t.strip() for t in user_types_str.split(",")] if user_types_str else []

        matching_ids = set()

        # Check Students if target_types is empty or includes 'student'
        if not target_types or "student" in target_types:
            stmt_stu = (
                select(User.id)
                .join(StudentProfile, User.id == StudentProfile.user_id)
                .where(
                    User.user_type == UserType.student,
                    User.account_status == AccountStatus.active
                )
            )
            if filter_rules.course_id:
                stmt_stu = stmt_stu.where(StudentProfile.course_id == filter_rules.course_id)
            if filter_rules.department_id:
                stmt_stu = stmt_stu.where(StudentProfile.department_id == filter_rules.department_id)
            if filter_rules.year:
                stmt_stu = stmt_stu.where(StudentProfile.year == filter_rules.year)
            if filter_rules.hostel:
                from app.models.infrastructure import Room, Building
                stmt_stu = stmt_stu.join(Room, StudentProfile.room_id == Room.id).join(Building, Room.building_id == Building.id).where(func.lower(Building.name) == filter_rules.hostel.strip().lower())

            res_stu = await self.db.execute(stmt_stu)
            for uid in res_stu.scalars().all():
                matching_ids.add(uid)

        # Check Faculty if target_types is empty or includes 'faculty'
        # Note: year and hostel do not apply to faculty
        if (not target_types or "faculty" in target_types) and not filter_rules.year and not filter_rules.hostel:
            stmt_fac = (
                select(User.id)
                .join(FacultyProfile, User.id == FacultyProfile.user_id)
                .where(
                    User.user_type == UserType.faculty,
                    User.account_status == AccountStatus.active
                )
            )
            if filter_rules.department_id:
                stmt_fac = stmt_fac.where(FacultyProfile.department_id == filter_rules.department_id)

            res_fac = await self.db.execute(stmt_fac)
            for uid in res_fac.scalars().all():
                matching_ids.add(uid)

        return list(matching_ids)

    async def add_members(self, group_id: UUID, user_ids: List[UUID], added_manually: bool = False) -> int:
        if not user_ids:
            return 0

        added_count = 0
        for uid in user_ids:
            stmt = (
                pg_insert(AudienceGroupMember)
                .values(
                    id=func.gen_random_uuid(),
                    group_id=group_id,
                    user_id=uid,
                    added_manually=added_manually
                )
                .on_conflict_do_nothing(
                    index_elements=["group_id", "user_id"]
                )
            )
            res = await self.db.execute(stmt)
            if res.rowcount and res.rowcount > 0:
                added_count += 1
        return added_count

    async def remove_member(self, group_id: UUID, user_id: UUID) -> bool:
        stmt = delete(AudienceGroupMember).where(
            AudienceGroupMember.group_id == group_id,
            AudienceGroupMember.user_id == user_id
        )
        res = await self.db.execute(stmt)
        return (res.rowcount or 0) > 0

    async def clear_members(self, group_id: UUID, only_filtered: bool = False) -> int:
        stmt = delete(AudienceGroupMember).where(AudienceGroupMember.group_id == group_id)
        if only_filtered:
            stmt = stmt.where(AudienceGroupMember.added_manually == False)
        res = await self.db.execute(stmt)
        return res.rowcount or 0

    async def get_members_with_profiles(self, group_id: UUID) -> List[Tuple[AudienceGroupMember, User]]:
        from app.models.infrastructure import Room
        stmt = (
            select(AudienceGroupMember, User)
            .join(User, AudienceGroupMember.user_id == User.id)
            .options(
                selectinload(User.student_profile).selectinload(StudentProfile.course),
                selectinload(User.student_profile).selectinload(StudentProfile.department),
                selectinload(User.student_profile).selectinload(StudentProfile.room).selectinload(Room.building),
                selectinload(User.faculty_profile).selectinload(FacultyProfile.department),
            )
            .where(AudienceGroupMember.group_id == group_id)
            .order_by(User.name.asc())
        )
        res = await self.db.execute(stmt)
        return res.all()

    async def count_members(self, group_id: UUID) -> int:
        stmt = select(func.count(AudienceGroupMember.id)).where(AudienceGroupMember.group_id == group_id)
        return (await self.db.scalar(stmt)) or 0
