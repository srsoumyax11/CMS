from typing import List, Optional, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.academic import Course, Department
from app.models.settings import SystemSetting
from app.repositories.base_repository import GenericRepository

class CourseRepository(GenericRepository[Course]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, Course)
        
    async def get_by_code(self, code: str) -> Optional[Course]:
        result = await self.db.execute(select(Course).where(Course.code == code))
        return result.scalar_one_or_none()

class DepartmentRepository(GenericRepository[Department]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, Department)
        
    async def get_by_code(self, code: str) -> Optional[Department]:
        result = await self.db.execute(select(Department).where(Department.code == code))
        return result.scalar_one_or_none()

class SystemSettingRepository(GenericRepository[SystemSetting]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, SystemSetting)
        
    async def get_by_key(self, key: str) -> Optional[SystemSetting]:
        result = await self.db.execute(select(SystemSetting).where(SystemSetting.key == key))
        return result.scalar_one_or_none()
