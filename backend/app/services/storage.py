import uuid
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

from fastapi import HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError

from app.core.config import settings

IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}
VIDEO_TYPES = {
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/quicktime": ".mov",
}
CHUNK_SIZE = 1024 * 1024


@dataclass(slots=True)
class StoredFile:
    url: str
    media_type: str
    width: int | None
    height: int | None
    size: int
    original_name: str


class LocalStorage:
    """Filesystem storage for local development.

    The API surface (`save`) is intentionally small so an S3Storage
    implementation with presigned uploads can replace it in production.
    """

    async def save(self, file: UploadFile) -> StoredFile:
        content_type = (file.content_type or "").lower()
        if content_type in IMAGE_TYPES:
            extension = IMAGE_TYPES[content_type]
            media_type = "image"
            max_bytes = settings.max_image_mb * 1024 * 1024
        elif content_type in VIDEO_TYPES:
            extension = VIDEO_TYPES[content_type]
            media_type = "video"
            max_bytes = settings.max_video_mb * 1024 * 1024
        else:
            raise HTTPException(
                status_code=415,
                detail="仅支持 JPG / PNG / WebP / GIF 图片或 MP4 / WebM / MOV 视频",
            )

        now = datetime.now(UTC)
        relative_path = Path(f"{now:%Y/%m}/{uuid.uuid4().hex}{extension}")
        destination = settings.media_root / relative_path
        destination.parent.mkdir(parents=True, exist_ok=True)

        size = 0
        try:
            with destination.open("wb") as output:
                while chunk := await file.read(CHUNK_SIZE):
                    size += len(chunk)
                    if size > max_bytes:
                        raise HTTPException(
                            status_code=413,
                            detail=f"文件超过上限（{max_bytes // 1024 // 1024} MB）",
                        )
                    output.write(chunk)
        except HTTPException:
            destination.unlink(missing_ok=True)
            raise
        except Exception:
            destination.unlink(missing_ok=True)
            raise HTTPException(status_code=500, detail="文件保存失败") from None
        finally:
            await file.close()

        if size == 0:
            destination.unlink(missing_ok=True)
            raise HTTPException(status_code=400, detail="文件为空")

        width: int | None = None
        height: int | None = None
        if media_type == "image":
            try:
                with Image.open(destination) as image:
                    width, height = image.size
                    image.verify()
            except (UnidentifiedImageError, OSError):
                destination.unlink(missing_ok=True)
                raise HTTPException(status_code=400, detail="无法识别的图片文件") from None

        return StoredFile(
            url=f"{settings.media_url_prefix}/{relative_path.as_posix()}",
            media_type=media_type,
            width=width,
            height=height,
            size=size,
            original_name=file.filename or "upload",
        )


storage = LocalStorage()
