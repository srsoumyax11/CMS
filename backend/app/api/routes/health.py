from fastapi import APIRouter
from app.schemas.common import APIResponse

router = APIRouter()

@router.get("/health", response_model=APIResponse[str])
async def health_check():
    return APIResponse(success=True, data="Backend is healthy", error=None)
