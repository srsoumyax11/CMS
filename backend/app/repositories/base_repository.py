from typing import Generic, TypeVar, Type, List, Tuple, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

T = TypeVar("T")

class GenericRepository(Generic[T]):
    def __init__(self, db: AsyncSession, model_class: Type[T]):
        self.db = db
        self.model_class = model_class

    async def get_by_id(self, id: Any) -> Optional[T]:
        stmt = select(self.model_class).where(self.model_class.id == id)
        if hasattr(self.model_class, 'deleted_at'):
            stmt = stmt.where(self.model_class.deleted_at.is_(None))
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list(
        self,
        filters: Optional[Dict[str, Any]] = None,
        skip: int = 0,
        limit: int = 100,
        order_by: Optional[Any] = None,
        options: Optional[List[Any]] = None
    ) -> Tuple[List[T], int]:
        """Generic list with optional filters, ordering, eager loading, and pagination."""
        stmt = select(self.model_class)
        
        # Apply filters
        if filters:
            for col_name, value in filters.items():
                if hasattr(self.model_class, col_name):
                    col = getattr(self.model_class, col_name)
                    stmt = stmt.where(col == value)
        
        # Handle Soft Deletes automatically
        if hasattr(self.model_class, 'deleted_at'):
            stmt = stmt.where(self.model_class.deleted_at.is_(None))
            
        # Apply order_by
        if order_by is not None:
            stmt = stmt.order_by(order_by)

        # Apply eager loading options
        if options:
            for opt in options:
                stmt = stmt.options(opt)
        
        # Count statement
        count_stmt = select(func.count()).select_from(self.model_class)
        if filters:
            for col_name, value in filters.items():
                if hasattr(self.model_class, col_name):
                    col = getattr(self.model_class, col_name)
                    count_stmt = count_stmt.where(col == value)
        if hasattr(self.model_class, 'deleted_at'):
            count_stmt = count_stmt.where(self.model_class.deleted_at.is_(None))
                    
        count = await self.db.scalar(count_stmt)
        
        # Paginate
        result = await self.db.execute(stmt.offset(skip).limit(limit))
        items = list(result.scalars().all())
        
        return items, count or 0


    async def create(self, obj_in: T) -> T:
        self.db.add(obj_in)
        await self.db.flush()
        return obj_in

    async def update(self, db_obj: T, obj_in: Dict[str, Any]) -> T:
        for field, value in obj_in.items():
            if hasattr(db_obj, field):
                setattr(db_obj, field, value)
        self.db.add(db_obj)
        await self.db.flush()
        return db_obj

    async def delete(self, id: Any) -> bool:
        obj = await self.get_by_id(id)
        if obj:
            if hasattr(obj, 'deleted_at'):
                from datetime import datetime, timezone
                obj.deleted_at = datetime.now(timezone.utc)
                self.db.add(obj)
            else:
                await self.db.delete(obj)
            await self.db.flush()
            return True
        return False
