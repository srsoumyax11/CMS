from typing import List, Tuple, Optional
from uuid import UUID
from datetime import datetime

from app.core.uow import UnitOfWork
from app.repositories.audience_group_repository import AudienceGroupRepository
from app.repositories.metadata_repository import CourseRepository, DepartmentRepository
from app.repositories.user_repository import UserRepository
from app.models.audience_group import AudienceGroup, AudienceGroupMember
from app.models.user import User, UserType, AccountStatus
from app.schemas.audience_group import (
    AudienceGroupCreateRequest,
    AudienceGroupUpdateRequest,
    AudienceGroupMemberAddRequest,
    AudienceFilterRules,
    AudienceGroupDetailResponse,
    AudienceGroupMemberItemResponse,
    AudienceGroupReapplyResponse
)
from app.services.audit_service import AuditService

class AudienceGroupService:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow
        self.repo = AudienceGroupRepository(uow.db)
        self.course_repo = CourseRepository(uow.db)
        self.dept_repo = DepartmentRepository(uow.db)
        self.user_repo = UserRepository(uow.db)
        self.audit_service = AuditService(uow.db)

    def _map_group_response(self, group: AudienceGroup, member_count: int) -> AudienceGroupDetailResponse:
        creator = group.created_by
        course = group.filter_course
        dept = group.filter_department
        return AudienceGroupDetailResponse(
            id=group.id,
            name=group.name,
            description=group.description,
            created_by_id=group.created_by_id,
            created_by_name=creator.name if creator else "Unknown",
            filter_course_id=group.filter_course_id,
            filter_course_name=course.name if course else None,
            filter_department_id=group.filter_department_id,
            filter_department_name=dept.name if dept else None,
            filter_year=group.filter_year,
            filter_hostel=group.filter_hostel,
            filter_user_types=group.filter_user_types,
            member_count=member_count,
            created_at=group.created_at,
            updated_at=group.updated_at
        )

    def _user_matches_filter(self, user: User, group: AudienceGroup) -> bool:
        if not group.filter_course_id and not group.filter_department_id and not group.filter_year and not group.filter_hostel and not group.filter_user_types:
            return True

        if user.account_status != AccountStatus.active:
            return False

        if group.filter_user_types:
            target_types = [t.strip().lower() for t in group.filter_user_types.split(",")]
            if user.user_type.value.lower() not in target_types:
                return False

        if user.user_type == UserType.student:
            p = user.student_profile
            if not p:
                return False
            if group.filter_course_id and p.course_id != group.filter_course_id:
                return False
            if group.filter_department_id and p.department_id != group.filter_department_id:
                return False
            if group.filter_year and p.year != group.filter_year:
                return False
            student_hostel = p.room.building.name if (p and getattr(p, 'room', None) and getattr(p.room, 'building', None)) else None
            if group.filter_hostel and (not student_hostel or student_hostel.strip().lower() != group.filter_hostel.strip().lower()):
                return False
            return True

        elif user.user_type == UserType.faculty:
            p = user.faculty_profile
            if not p:
                return False
            if group.filter_course_id and p.course_id != group.filter_course_id:
                return False
            if group.filter_department_id and p.department_id != group.filter_department_id:
                return False
            if group.filter_year or group.filter_hostel:
                return False
            return True

        return False

    async def create_group(self, data: AudienceGroupCreateRequest, current_user: User) -> AudienceGroupDetailResponse:
        existing = await self.repo.get_by_name(data.name)
        if existing:
            raise ValueError(f"Audience group with name '{data.name}' already exists")

        rules = data.filter_rules
        if rules:
            if rules.course_id:
                c = await self.course_repo.get_by_id(rules.course_id)
                if not c or not c.is_active:
                    raise ValueError("Specified course is invalid or inactive")
            if rules.department_id:
                d = await self.dept_repo.get_by_id(rules.department_id)
                if not d or not d.is_active:
                    raise ValueError("Specified department is invalid or inactive")

        async with self.uow.transaction():
            # 1. Create the Group
            group = AudienceGroup(
                name=data.name.strip(),
                description=data.description.strip() if data.description else None,
                created_by_id=current_user.id,
                filter_course_id=rules.course_id if rules else None,
                filter_department_id=rules.department_id if rules else None,
                filter_year=rules.year if rules else None,
                filter_hostel=rules.hostel.strip().lower() if rules and rules.hostel else None,
                filter_user_types=rules.user_types.strip() if rules and rules.user_types else None,
            )
            await self.repo.create(group)

            # 2. Run Filter Once to build initial member list
            filtered_user_ids = await self.repo.evaluate_filter_users(rules) if rules else []
            if filtered_user_ids:
                await self.repo.add_members(group.id, filtered_user_ids, added_manually=False)

            # 3. Add explicit initial members if provided
            if data.initial_member_ids:
                await self.repo.add_members(group.id, data.initial_member_ids, added_manually=True)

            await self.audit_service.log_action(
                actor_id=current_user.id,
                resource_type="AudienceGroup",
                resource_id=group.id,
                action="CREATE_AUDIENCE_GROUP",
                new_values={"name": group.name, "filtered_members": len(filtered_user_ids)}
            )

        res = await self.repo.get_with_relations(group.id)
        return self._map_group_response(res[0], res[1])

    async def get_group(self, group_id: UUID) -> AudienceGroupDetailResponse:
        res = await self.repo.get_with_relations(group_id)
        if not res:
            raise ValueError("Audience group not found")
        return self._map_group_response(res[0], res[1])

    async def list_groups(self, skip: int = 0, limit: int = 100) -> List[AudienceGroupDetailResponse]:
        rows = await self.repo.list_groups_with_counts(skip=skip, limit=limit)
        return [self._map_group_response(r[0], r[1]) for r in rows]

    async def update_group(self, group_id: UUID, data: AudienceGroupUpdateRequest, current_user: User) -> AudienceGroupDetailResponse:
        res = await self.repo.get_with_relations(group_id)
        if not res:
            raise ValueError("Audience group not found")
        group, count = res

        if data.name and data.name.strip().lower() != group.name.lower():
            dup = await self.repo.get_by_name(data.name.strip())
            if dup and dup.id != group_id:
                raise ValueError(f"Audience group with name '{data.name}' already exists")

        async with self.uow.transaction():
            old_values = {"name": group.name}
            if data.name is not None:
                group.name = data.name.strip()
            if data.description is not None:
                group.description = data.description.strip() if data.description else None

            if data.filter_rules is not None:
                rules = data.filter_rules
                group.filter_course_id = rules.course_id
                group.filter_department_id = rules.department_id
                group.filter_year = rules.year
                group.filter_hostel = rules.hostel.strip().lower() if rules.hostel else None
                group.filter_user_types = rules.user_types.strip() if rules.user_types else None

            await self.audit_service.log_action(
                actor_id=current_user.id,
                resource_type="AudienceGroup",
                resource_id=group.id,
                action="UPDATE_AUDIENCE_GROUP",
                old_values=old_values,
                new_values={"name": group.name}
            )

        updated_res = await self.repo.get_with_relations(group_id)
        return self._map_group_response(updated_res[0], updated_res[1])

    async def delete_group(self, group_id: UUID, current_user: User) -> bool:
        group = await self.repo.get_by_id(group_id)
        if not group:
            raise ValueError("Audience group not found")

        async with self.uow.transaction():
            await self.repo.delete(group_id)
            await self.audit_service.log_action(
                actor_id=current_user.id,
                resource_type="AudienceGroup",
                resource_id=group_id,
                action="DELETE_AUDIENCE_GROUP",
                old_values={"name": group.name},
                new_values={"status": "deleted"}
            )
            return True

    async def list_members(self, group_id: UUID) -> List[AudienceGroupMemberItemResponse]:
        group = await self.repo.get_by_id(group_id)
        if not group:
            raise ValueError("Audience group not found")

        members = await self.repo.get_members_with_profiles(group_id)
        results = []
        for mem, u in members:
            course_name = None
            dept_name = None
            year = None
            hostel = None

            if u.user_type == UserType.student and u.student_profile:
                p = u.student_profile
                course_name = p.course.name if p.course else None
                dept_name = p.department.name if p.department else None
                year = p.year
                hostel = p.room.building.name if (p and getattr(p, 'room', None) and getattr(p.room, 'building', None)) else None
            elif u.user_type == UserType.faculty and u.faculty_profile:
                p = u.faculty_profile
                course_name = p.course.name if p.course else None
                dept_name = p.department.name if p.department else None

            matches = self._user_matches_filter(u, group)

            results.append(AudienceGroupMemberItemResponse(
                id=mem.id,
                user_id=u.id,
                name=u.name,
                email=u.email,
                user_type=u.user_type.value,
                department_name=dept_name,
                course_name=course_name,
                year=year,
                hostel=hostel,
                added_manually=mem.added_manually,
                added_at=mem.added_at,
                matches_filter=matches
            ))
        return results

    async def add_members(self, group_id: UUID, req: AudienceGroupMemberAddRequest, current_user: User) -> int:
        group = await self.repo.get_by_id(group_id)
        if not group:
            raise ValueError("Audience group not found")

        async with self.uow.transaction():
            added_count = await self.repo.add_members(group_id, req.user_ids, added_manually=True)
            await self.audit_service.log_action(
                actor_id=current_user.id,
                resource_type="AudienceGroup",
                resource_id=group_id,
                action="ADD_GROUP_MEMBERS",
                new_values={"added_count": added_count}
            )
            return added_count

    async def remove_member(self, group_id: UUID, user_id: UUID, current_user: User) -> bool:
        group = await self.repo.get_by_id(group_id)
        if not group:
            raise ValueError("Audience group not found")

        async with self.uow.transaction():
            removed = await self.repo.remove_member(group_id, user_id)
            if removed:
                await self.audit_service.log_action(
                    actor_id=current_user.id,
                    resource_type="AudienceGroup",
                    resource_id=group_id,
                    action="REMOVE_GROUP_MEMBER",
                    old_values={"user_id": str(user_id)},
                    new_values={"status": "removed"}
                )
            return removed

    async def reapply_filter(self, group_id: UUID, keep_manual: bool, current_user: User) -> AudienceGroupReapplyResponse:
        group = await self.repo.get_by_id(group_id)
        if not group:
            raise ValueError("Audience group not found")

        rules = AudienceFilterRules(
            course_id=group.filter_course_id,
            department_id=group.filter_department_id,
            year=group.filter_year,
            hostel=group.filter_hostel,
            user_types=group.filter_user_types
        )

        previous_count = await self.repo.count_members(group_id)

        async with self.uow.transaction():
            # 1. Clear previous filtered members (or all members if keep_manual is False)
            removed_count = await self.repo.clear_members(group_id, only_filtered=keep_manual)

            # 2. Evaluate filter rules to find currently matching users
            matching_user_ids = await self.repo.evaluate_filter_users(rules)

            # 3. Bulk insert newly matching users
            added_count = await self.repo.add_members(group_id, matching_user_ids, added_manually=False)

            new_count = await self.repo.count_members(group_id)

            await self.audit_service.log_action(
                actor_id=current_user.id,
                resource_type="AudienceGroup",
                resource_id=group_id,
                action="REAPPLY_GROUP_FILTER",
                old_values={"previous_count": previous_count},
                new_values={"new_count": new_count, "keep_manual": keep_manual}
            )

        return AudienceGroupReapplyResponse(
            group_id=group_id,
            previous_count=previous_count,
            new_count=new_count,
            added_count=added_count,
            removed_count=removed_count
        )
