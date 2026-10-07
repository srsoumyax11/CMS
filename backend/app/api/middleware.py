import functools
from fastapi import HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Callable, Any

def verify_ownership(resource_name: str, id_param: str = "id"):
    """
    A decorator to perform row-level IDOR protection.
    It intercepts the route, extracts the ID from kwargs (or path_params),
    fetches the resource using the service injected in kwargs,
    and checks if the current_user is allowed to access it.
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs) -> Any:
            # We assume current_user and user_permissions are available in kwargs
            # because they are typical dependencies in protected routes.
            current_user = kwargs.get("current_user")
            permissions = kwargs.get("permissions") or kwargs.get("user_permissions") or set()
            
            if not current_user:
                # If current_user isn't directly injected, we can't do row-level checks easily here
                # without inspecting request state, so we expect it in kwargs.
                return await func(*args, **kwargs)

            resource_id = kwargs.get(id_param)
            if not resource_id:
                return await func(*args, **kwargs)

            if resource_name == "complaint":
                service = kwargs.get("service")
                if service and hasattr(service, "get_complaint"):
                    complaint = await service.get_complaint(resource_id)
                    if complaint:
                        from app.api.deps import can_view_complaint_detail
                        if not can_view_complaint_detail(complaint, current_user, permissions):
                            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this complaint")

            return await func(*args, **kwargs)
        return wrapper
    return decorator
