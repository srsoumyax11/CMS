import re
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.settings import SystemSetting

async def validate_password(password: str, db: AsyncSession) -> None:
    """
    Validates a password against the rules configured in SystemSettings.
    Raises HTTPException 400 if validation fails.
    """
    # Fetch rules from DB
    result = await db.execute(select(SystemSetting).where(SystemSetting.key.like("auth.password.%")))
    settings = result.scalars().all()
    
    rules = {
        "min_length": 8,
        "require_uppercase": True,
        "require_lowercase": True,
        "require_number": True,
        "require_special": True
    }
    
    for s in settings:
        if s.key == "auth.password.min_length":
            rules["min_length"] = int(s.value) if s.value and s.value.isdigit() else 8
        elif s.key == "auth.password.require_uppercase":
            rules["require_uppercase"] = s.value.lower() == "true" if s.value else True
        elif s.key == "auth.password.require_lowercase":
            rules["require_lowercase"] = s.value.lower() == "true" if s.value else True
        elif s.key == "auth.password.require_number":
            rules["require_number"] = s.value.lower() == "true" if s.value else True
        elif s.key == "auth.password.require_special":
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
