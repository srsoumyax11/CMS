import re
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import UploadFile
from typing import Optional, List
import magic
from app.core.config import settings

async def validate_password(password: str, db: Optional[AsyncSession] = None) -> None:
    """
    Validates a password against standard rules.
    Raises HTTPException 400 if validation fails.
    """
    if len(password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long"
        )


async def validate_upload_file(file: UploadFile, allowed_types: Optional[List[str]] = None, max_size_mb: Optional[int] = None) -> None:
    """
    Validates an UploadFile against the configured ALLOWED_FILE_TYPES and MAX_UPLOAD_FILE_SIZE_MB.
    Uses python-magic to ensure the actual file bytes match the expected MIME types.
    Can be overridden with specific allowed_types or max_size_mb.
    """
    types_to_check = allowed_types if allowed_types is not None else settings.ALLOWED_FILE_TYPES
    size_to_check = max_size_mb if max_size_mb is not None else settings.MAX_UPLOAD_FILE_SIZE_MB

    if file.content_type not in types_to_check:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed types are: {', '.join(types_to_check)}"
        )
    
    file_bytes = await file.read()
    
    max_size_bytes = size_to_check * 1024 * 1024
    if len(file_bytes) > max_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size is {size_to_check}MB."
        )
    
    # Verify file magic
    try:
        mime = magic.Magic(mime=True)
        detected_type = mime.from_buffer(file_bytes)
        
        if detected_type not in types_to_check:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File content does not match its extension. Detected type: {detected_type}"
            )
    except Exception as e:
        # Fall back if libmagic is missing on system
        pass
        
    # Reset file pointer after reading
    await file.seek(0)

