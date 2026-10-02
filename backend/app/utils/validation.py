import re
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import UploadFile
from typing import Optional, List
import magic
from app.models.settings import SystemSetting
from app.core.config import settings

async def validate_password(password: str, db: AsyncSession) -> None:
    """
    Validates a password against the rules configured in SystemSettings.
    Raises HTTPException 400 if validation fails.
    """
    result = await db.execute(select(SystemSetting))
    settings = result.scalars().all()
    
    rules = {
        "min_length": 8,
        "require_uppercase": True,
        "require_lowercase": True,
        "require_number": True,
        "require_special": True
    }
    
    for s in settings:
        if s.key == "min_password_length":
            rules["min_length"] = int(s.value) if s.value and s.value.isdigit() else 8
        elif s.key == "require_uppercase":
            rules["require_uppercase"] = s.value.lower() == "true" if s.value else True
        elif s.key == "require_lowercase":
            # Just default to requiring lower if upper is required usually
            rules["require_lowercase"] = True
        elif s.key == "require_numbers":
            rules["require_number"] = s.value.lower() == "true" if s.value else True
        elif s.key == "require_special_chars":
            rules["require_special"] = s.value.lower() == "true" if s.value else True

    # Validate
    if len(password) < rules["min_length"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Password must be at least {rules['min_length']} characters long"
        )
        
    if rules["require_uppercase"] and not any(c.isupper() for c in password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one uppercase letter"
        )
        
    if rules["require_lowercase"] and not any(c.islower() for c in password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one lowercase letter"
        )
        
    if rules["require_number"] and not any(c.isdigit() for c in password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one number"
        )
        
    special_chars = re.compile(r'[^a-zA-Z0-9]')
    if rules["require_special"] and not special_chars.search(password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one special character"
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

