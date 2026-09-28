from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
import jwt
from pwdlib import PasswordHash
from pwdlib.hashers.bcrypt import BcryptHasher

from app.core.config import settings

from fastapi.security import OAuth2PasswordBearer
from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select
from app.core.database import get_db
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

password_hash = PasswordHash((BcryptHasher(),))

def hash_password(password: str) -> str:
    return password_hash.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return password_hash.verify(plain_password, hashed_password)

def create_access_token(subject: str | Any, expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    
    to_encode = {"exp": expire, "sub": str(subject)}
    if isinstance(subject, dict):
        to_encode.update(subject)
        
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def create_verification_token(subject: str | Any, new_email: str, expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(hours=2)
    
    to_encode = {"exp": expire, "sub": str(subject), "type": "email_verification", "new_email": new_email}
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def create_refresh_token(subject: str | Any, expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_REFRESH_EXPIRE_MINUTES)
    
    to_encode = {"exp": expire, "sub": str(subject), "type": "refresh"}
    if isinstance(subject, dict):
        to_encode.update(subject)
        
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def decode_token(token: str) -> Dict[str, Any]:
    try:
        decoded_token = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return decoded_token
    except jwt.PyJWTError:
        return None

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_token(token)
    if payload is None:
        raise credentials_exception
    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception
        
    stmt = select(User).options(selectinload(User.student_profile), selectinload(User.faculty_profile)).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception
    return user
