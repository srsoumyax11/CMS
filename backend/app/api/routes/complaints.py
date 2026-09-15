from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timedelta

from app.core.database import get_db
from app.core.security import get_current_user
from app.api.deps import require_permission, get_user_permissions, can_view_complaint_detail
from app.core.permissions import Perms
from app.core.storage import upload_complaint_photo, get_signed_url
from app.models.user import User
from app.models.complaint import Complaint, ComplaintStatusLog, ComplaintCategory, ComplaintVisibility, ComplaintStatus
from app.schemas.common import APIResponse
from app.schemas.complaint import ComplaintResponse, ComplaintListResponse

router = APIRouter()

MAX_FILE_SIZE = 5 * 1024 * 1024 # 5 MB
ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"]

@router.post("", response_model=APIResponse[ComplaintResponse])
async def create_complaint(
    category: ComplaintCategory = Form(...),
    location_hostel: str = Form(...),
    location_room: Optional[str] = Form(None),
    description: str = Form(...),
    visibility: ComplaintVisibility = Form(ComplaintVisibility.public),
    photo: Optional[UploadFile] = File(None),
    current_user: User = Depends(require_permission(Perms.COMPLAINT_CREATE)),
    db: AsyncSession = Depends(get_db)
):
    # Rate Limiting check
    one_hour_ago = datetime.utcnow() - timedelta(hours=1)
    stmt = select(func.count(Complaint.id)).where(
        Complaint.raised_by == current_user.id,
        Complaint.created_at >= one_hour_ago
    )
    result = await db.execute(stmt)
    count = result.scalar()
    
    if count >= 3:
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Maximum 3 complaints per hour.")

    photo_path = None
    if photo:
        if photo.content_type not in ALLOWED_CONTENT_TYPES:
            raise HTTPException(status_code=400, detail="Invalid file type. Only JPEG, PNG, and WEBP are allowed.")
            
        file_bytes = await photo.read()
        if len(file_bytes) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB.")
            
        # Reset file pointer after reading length
        await photo.seek(0)
        
        try:
            photo_path = await upload_complaint_photo(photo, str(current_user.id))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to upload photo: {str(e)}")

    location_hostel = location_hostel.strip().lower()
    
    complaint = Complaint(
        raised_by=current_user.id,
        category=category,
        location_hostel=location_hostel,
        location_room=location_room,
        description=description,
        visibility=visibility,
        photo_url=photo_path,
        status=ComplaintStatus.open
    )
    db.add(complaint)
    await db.flush() # To get complaint.id
    
    status_log = ComplaintStatusLog(
        complaint_id=complaint.id,
        status=ComplaintStatus.open,
        changed_by=current_user.id,
        note="Complaint raised."
    )
    db.add(status_log)
    await db.commit()
    await db.refresh(complaint)
        
    # Re-fetch for response mapping if needed, or construct response
    response_data = ComplaintResponse.model_validate(complaint)
    if response_data.photo_url:
        response_data.photo_url = get_signed_url("complaint-attachments", response_data.photo_url)
        
    return APIResponse(success=True, data=response_data)

@router.get("/mine", response_model=APIResponse[ComplaintListResponse])
async def get_my_complaints(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(require_permission(Perms.COMPLAINT_VIEW)),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Complaint).where(Complaint.raised_by == current_user.id).order_by(Complaint.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(stmt)
    complaints = result.scalars().all()
    
    count_stmt = select(func.count(Complaint.id)).where(Complaint.raised_by == current_user.id)
    total = (await db.execute(count_stmt)).scalar()
    
    items = []
    for c in complaints:
        c_res = ComplaintResponse.model_validate(c)
        if c.photo_url:
            c_res.photo_url = get_signed_url("complaint-attachments", c.photo_url)
        items.append(c_res)
        
    return APIResponse(success=True, data=ComplaintListResponse(total=total, items=items))

@router.get("/public", response_model=APIResponse[ComplaintListResponse])
async def get_public_complaints(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    _: User = Depends(require_permission(Perms.COMPLAINT_VIEW)),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Complaint).where(Complaint.visibility == ComplaintVisibility.public).order_by(Complaint.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(stmt)
    complaints = result.scalars().all()
    
    count_stmt = select(func.count(Complaint.id)).where(Complaint.visibility == ComplaintVisibility.public)
    total = (await db.execute(count_stmt)).scalar()
    
    items = []
    for c in complaints:
        c_res = ComplaintResponse.model_validate(c)
        if c.photo_url:
            c_res.photo_url = get_signed_url("complaint-attachments", c.photo_url)
        items.append(c_res)
        
    return APIResponse(success=True, data=ComplaintListResponse(total=total, items=items))

@router.get("/{id}", response_model=APIResponse[ComplaintResponse])
async def get_complaint(
    id: UUID,
    current_user: User = Depends(require_permission(Perms.COMPLAINT_VIEW)),
    user_permissions: set = Depends(get_user_permissions),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Complaint).where(Complaint.id == id)
    result = await db.execute(stmt)
    complaint = result.scalar_one_or_none()
    
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
        
    if not can_view_complaint_detail(complaint, current_user, user_permissions):
        # We raise 403 because we found the complaint but the user lacks visibility
        raise HTTPException(status_code=403, detail="Not authorized to view this complaint")
        
    response_data = ComplaintResponse.model_validate(complaint)
    if complaint.photo_url:
        response_data.photo_url = get_signed_url("complaint-attachments", complaint.photo_url)
        
    return APIResponse(success=True, data=response_data)

@router.patch("/{id}/cancel", response_model=APIResponse[ComplaintResponse])
async def cancel_complaint(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Complaint).where(Complaint.id == id)
    result = await db.execute(stmt)
    complaint = result.scalar_one_or_none()
    
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
        
    # Ownership check
    if complaint.raised_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to cancel this complaint")
        
    if complaint.status != ComplaintStatus.open:
        raise HTTPException(status_code=400, detail="Only open complaints can be cancelled")
        
    complaint.status = ComplaintStatus.cancelled
    
    status_log = ComplaintStatusLog(
        complaint_id=complaint.id,
        status=ComplaintStatus.cancelled,
        changed_by=current_user.id,
        note="Cancelled by creator."
    )
    db.add(status_log)
    await db.commit()
    await db.refresh(complaint)
        
    response_data = ComplaintResponse.model_validate(complaint)
    if complaint.photo_url:
        response_data.photo_url = get_signed_url("complaint-attachments", complaint.photo_url)
        
    return APIResponse(success=True, data=response_data)
