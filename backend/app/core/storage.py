import os
import uuid
import mimetypes
from fastapi import UploadFile
from supabase import create_client, Client
from app.core.config import settings

supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

from typing import Optional

async def upload_avatar(file: UploadFile, user_id: str) -> str:
    """
    Uploads a user's avatar to Supabase storage.
    Returns the public URL of the uploaded image.
    """
    bucket_name = "avatars"
    filename = file.filename or ""
    file_extension = filename.split(".")[-1] if "." in filename else "jpg"
    file_path = f"{user_id}/{uuid.uuid4()}.{file_extension}"
    
    file_bytes = await file.read()
    guessed_type = mimetypes.guess_type(filename)[0] if filename else None
    content_type = file.content_type or guessed_type or "image/jpeg"
    
    res = supabase.storage.from_(bucket_name).upload(
        path=file_path,
        file=file_bytes,
        file_options={"content-type": content_type}
    )
    
    # Get public URL
    public_url = supabase.storage.from_(bucket_name).get_public_url(file_path)
    return public_url

async def upload_complaint_photo(file: UploadFile, user_id: str) -> str:
    """
    Uploads a complaint attachment to the private Supabase bucket.
    Returns the file path within the bucket, NOT a public URL.
    """
    bucket_name = "complaint-attachments"
    filename = file.filename or ""
    file_extension = filename.split(".")[-1] if "." in filename else "jpg"
    file_path = f"{user_id}/{uuid.uuid4()}.{file_extension}"
    
    file_bytes = await file.read()
    guessed_type = mimetypes.guess_type(filename)[0] if filename else None
    content_type = file.content_type or guessed_type or "image/jpeg"
    
    supabase.storage.from_(bucket_name).upload(
        path=file_path,
        file=file_bytes,
        file_options={"content-type": content_type}
    )
    
    return file_path

def get_signed_url(bucket_name: str, file_path: Optional[str], expires_in: int = 900) -> Optional[str]:
    """
    Generates a short-lived signed URL for accessing private bucket files.
    """
    if not file_path:
        return None
        
    try:
        response = supabase.storage.from_(bucket_name).create_signed_url(file_path, expires_in)
        if isinstance(response, dict) and "signedURL" in response:
            return str(response["signedURL"])
        if isinstance(response, dict):
            url = response.get("signedURL") or response.get("signedUrl")
            return str(url) if url else None
        return str(response) if response else None
    except Exception:
        return None

async def upload_notice_attachment(file_content: bytes, content_type: str) -> str:
    """
    Uploads a notice attachment to the public 'notice-attachments' bucket.
    Uses a strict MIME type to extension mapping to prevent arbitrary file upload vulnerabilities.
    Returns the public URL of the uploaded file.
    """
    ALLOWED_MIME_TYPES = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "application/pdf": ".pdf"
    }
    
    ext = ALLOWED_MIME_TYPES.get(content_type, ".bin")
    safe_filename = f"{uuid.uuid4()}{ext}"
    bucket_name = "notice-attachments"
    
    try:
        supabase.storage.from_(bucket_name).upload(
            file=file_content,
            path=safe_filename,
            file_options={"content-type": content_type}
        )
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Storage upload error: {str(e)}")
        raise Exception("Failed to upload notice attachment to storage")
        
    # Generate the public URL
    res = supabase.storage.from_(bucket_name).get_public_url(safe_filename)
    return res
