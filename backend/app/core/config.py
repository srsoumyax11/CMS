from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    ENVIRONMENT: str = "dev"
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:54322/postgres"
    JWT_SECRET_KEY: str = "dev_secret_key_change_in_prod_1234567890"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]
    SUPABASE_URL: str = "http://127.0.0.1:54321"
    SUPABASE_KEY: str = ""
    SUPERADMIN_EMAIL: str = "admin@cms.com"
    SUPERADMIN_PASSWORD: str = "SuperAdmin@123"


    # SMTP_HOST: str = "smtp.gmail.com"
    # SMTP_PORT: int = 587
    # SMTP / Email Service Secrets (Default: Local Supabase Mailpit on 54325)
    SMTP_HOST: str = "127.0.0.1"
    SMTP_PORT: int = 54325
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_SENDER_EMAIL: str = "noreply@cms.com"

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

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
