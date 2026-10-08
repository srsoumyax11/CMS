from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    ENVIRONMENT: str = "dev"
    DATABASE_URL: str = ""
    JWT_SECRET_KEY: str = ""
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000"]
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    SUPERADMIN_EMAIL: str = ""
    SUPERADMIN_PASSWORD: str = ""

    
    # Rate Limiting
    COMPLAINT_RATE_LIMIT_PER_HOUR: int = 3
    LOGIN_RATE_LIMIT_PER_MINUTE: int = 100
    GENERAL_RATE_LIMIT_PER_MINUTE: int = 1000
    
    # File Upload
    MAX_UPLOAD_FILE_SIZE_MB: int = 5
    ALLOWED_FILE_TYPES: List[str] = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
    
    # Expiry Times
    OTP_EXPIRY_MINUTES: int = 10
    SIGNED_URL_EXPIRY_SECONDS: int = 900
    
    # Business Logic
    MESS_OPTOUT_CUTOFF_HOUR: int = 10
    
    # Cache / Redis
    REDIS_URL: str = "redis://127.0.0.1:6379"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()
