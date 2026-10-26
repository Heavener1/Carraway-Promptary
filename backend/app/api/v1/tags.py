from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.common import TagListResponse
from app.services.prompt_service import list_tags

router = APIRouter(prefix="/tags", tags=["tags"])


@router.get("", response_model=TagListResponse)
async def get_tags(
    limit: int = Query(default=30, ge=1, le=100),
    q: str | None = Query(default=None, max_length=40),
    db: AsyncSession = Depends(get_db),
) -> TagListResponse:
    items = await list_tags(db, limit=limit, q=q)
    return TagListResponse(items=items)
