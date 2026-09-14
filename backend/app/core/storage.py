import uuid
import mimetypes
from fastapi import UploadFile
from supabase import create_client, Client
from app.core.config import settings

supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

async def upload_avatar(file: UploadFile, user_id: str) -> str:
    """
    Uploads a user's avatar to Supabase storage.
    Returns the public URL of the uploaded image.
    """
    bucket_name = "avatars"
    file_extension = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    file_path = f"{user_id}/{uuid.uuid4()}.{file_extension}"
    
    file_bytes = await file.read()
    content_type = file.content_type or mimetypes.guess_type(file.filename)[0] or "image/jpeg"
    
    res = supabase.storage.from_(bucket_name).upload(
        path=file_path,
        file=file_bytes,
        file_options={"content-type": content_type}
    )
    
    # Get public URL
    public_url = supabase.storage.from_(bucket_name).get_public_url(file_path)
    return public_url
