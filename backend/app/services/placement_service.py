from typing import List, Tuple, Dict, Any, Optional
from uuid import UUID
from datetime import date
from sqlalchemy import select

from app.core.uow import UnitOfWork
from app.models.placement import PlacementNotice, PlacementApplication, PlacementStatus, ApplicationStatus
from app.models.profiles import StudentProfile
from app.schemas.placement import (
    PlacementNoticeCreate,
    PlacementNoticeUpdate,
    PlacementApplicationCreate,
    PlacementApplicationStatusUpdate
)

class PlacementService:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow

    async def create_notice(self, creator_id: UUID, notice_in: PlacementNoticeCreate) -> PlacementNotice:
        async with self.uow.transaction() as u:
            notice = PlacementNotice(
                company=notice_in.company,
                title=notice_in.title,
                description=notice_in.description,
                job_type=notice_in.job_type,
                package_text=notice_in.package_text,
                eligible_course_ids=notice_in.eligible_course_ids or [],
                eligible_department_ids=notice_in.eligible_department_ids or [],
                min_cgpa=notice_in.min_cgpa,
                passout_year=notice_in.passout_year,
                last_date=notice_in.last_date,
                drive_date=notice_in.drive_date,
                status=notice_in.status,
                created_by=creator_id
            )
            return await u.placement_notices.create(notice)

    async def update_notice(self, notice_id: UUID, notice_in: PlacementNoticeUpdate) -> PlacementNotice:
        async with self.uow.transaction() as u:
            notice = await u.placement_notices.get_by_id(notice_id)
            if not notice:
                raise ValueError("Placement notice not found.")

            update_data = notice_in.model_dump(exclude_unset=True)
            return await u.placement_notices.update(notice, update_data)

    async def get_notice(self, notice_id: UUID) -> PlacementNotice:
        async with self.uow.transaction() as u:
            notice = await u.placement_notices.get_by_id(notice_id)
            if not notice:
                raise ValueError("Placement notice not found.")
            return notice

    async def list_notices(self, published_only: bool = True, skip: int = 0, limit: int = 100) -> Tuple[List[PlacementNotice], int]:
        async with self.uow.transaction() as u:
            if published_only:
                return await u.placement_notices.list_published(skip=skip, limit=limit)
            return await u.placement_notices.list(skip=skip, limit=limit)

    async def apply_for_drive(self, student_user_id: UUID, notice_id: UUID, app_in: PlacementApplicationCreate) -> PlacementApplication:
        async with self.uow.transaction() as u:
            p_notice = await u.placement_notices.get_by_id(notice_id)
            if not p_notice or p_notice.status != PlacementStatus.published:
                raise ValueError("Placement notice not available for application.")

            if p_notice.last_date and date.today() > p_notice.last_date:
                raise ValueError("Application deadline for this placement drive has passed.")

            existing = await u.placement_applications.get_by_student_and_notice(student_user_id, notice_id)
            if existing:
                raise ValueError("You have already applied for this placement drive.")

            # Validate Student Profile Eligibility if profile exists
            stmt = select(StudentProfile).where(StudentProfile.user_id == student_user_id)
            res = await u.db.execute(stmt)
            profile = res.scalar_one_or_none()

            if profile:
                student_cgpa = getattr(profile, "cgpa", None)
                student_batch_year = getattr(profile, "batch_year", None)

                if p_notice.min_cgpa is not None and student_cgpa is not None:
                    if float(student_cgpa) < p_notice.min_cgpa:
                        raise ValueError(f"Ineligible: Minimum required CGPA is {p_notice.min_cgpa}, but your CGPA is {student_cgpa}.")
                
                if p_notice.passout_year is not None and student_batch_year is not None:
                    if int(student_batch_year) != p_notice.passout_year:
                        raise ValueError(f"Ineligible: Target passout year is {p_notice.passout_year}.")


            application = PlacementApplication(
                notice_id=notice_id,
                student_user_id=student_user_id,
                resume_url=app_in.resume_url,
                status=ApplicationStatus.applied
            )
            return await u.placement_applications.create(application)

    async def update_application_status(self, officer_id: UUID, application_id: UUID, status_in: PlacementApplicationStatusUpdate) -> PlacementApplication:
        async with self.uow.transaction() as u:
            application = await u.placement_applications.get_by_id(application_id)
            if not application:
                raise ValueError("Placement application not found.")

            application.status = status_in.status
            application.updated_by = officer_id
            return await u.placement_applications.update(application, {})

    async def list_notice_applications(self, notice_id: UUID, skip: int = 0, limit: int = 100) -> Tuple[List[PlacementApplication], int]:
        async with self.uow.transaction() as u:
            return await u.placement_applications.get_notice_applications(notice_id, skip=skip, limit=limit)

    async def get_student_applications(self, student_user_id: UUID, skip: int = 0, limit: int = 100) -> Tuple[List[PlacementApplication], int]:
        async with self.uow.transaction() as u:
            return await u.placement_applications.get_student_applications(student_user_id, skip=skip, limit=limit)
