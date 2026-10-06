from typing import Optional, Dict, Any
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit import AuditLog

class AuditService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def log_action(
        self,
        actor_id: UUID,
        resource_type: str,
        resource_id: UUID,
        action: str,
        new_values: Optional[Dict[str, Any]] = None,
        old_values: Optional[Dict[str, Any]] = None,
        reason: Optional[str] = None
    ):

        """
        Logs an action into the audit trail.
        """
        log = AuditLog(
            actor_id=actor_id,
            resource_type=resource_type,
            resource_id=resource_id,
            action=action,
            old_values=old_values,
            new_values=new_values,
            reason=reason
        )
        self.db.add(log)
        # Flush to ensure it's written in the current transaction scope, but don't commit
        await self.db.flush()
