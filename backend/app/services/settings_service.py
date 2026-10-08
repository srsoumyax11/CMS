from typing import List, Tuple, Dict, Any, Optional
from app.core.uow import UnitOfWork
from app.models.settings import SystemSetting
from app.schemas.settings import SystemSettingCreateUpdate

class SettingsService:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow

    async def get_setting(self, key: str, default: Optional[str] = None) -> Optional[str]:
        async with self.uow.transaction() as u:
            setting = await u.system_settings.get_by_key(key)
            if setting and setting.value is not None:
                return setting.value
            return default

    async def set_setting(self, setting_in: SystemSettingCreateUpdate) -> SystemSetting:
        async with self.uow.transaction() as u:
            existing = await u.system_settings.get_by_key(setting_in.key)
            if existing:
                return await u.system_settings.update(existing, setting_in.model_dump(exclude_unset=True))
            else:
                setting = SystemSetting(
                    key=setting_in.key,
                    value=setting_in.value,
                    category=setting_in.category,
                    data_type=setting_in.data_type,
                    description=setting_in.description,
                    is_public=setting_in.is_public
                )
                return await u.system_settings.create(setting)

    async def list_settings(self, category: Optional[str] = None, public_only: bool = False) -> List[SystemSetting]:
        async with self.uow.transaction() as u:
            if public_only:
                return await u.system_settings.list_public_settings()
            if category:
                return await u.system_settings.list_by_category(category)
            items, _ = await u.system_settings.list(limit=500)
            return items
