from fastapi import APIRouter, Depends, File, UploadFile

from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.prompt import MediaUploadResponse
from app.services.storage import storage

router = APIRouter(prefix="/media", tags=["media"])


@router.post("/upload", response_model=MediaUploadResponse)
async def upload_media(
    file: UploadFile = File(...),
    _user: User = Depends(get_current_user),
) -> MediaUploadResponse:
    stored = await storage.save(file)
    return MediaUploadResponse(
        url=stored.url,
        media_type=stored.media_type,
        width=stored.width,
        height=stored.height,
        size=stored.size,
        original_name=stored.original_name,
    )
