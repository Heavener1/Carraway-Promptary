import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_admin
from app.schemas.prompt import (
    AdminPromptListResponse,
    AdminStats,
    PromptDetail,
    PromptStatus,
    ReviewRequest,
)
from app.services.prompt_service import (
    get_admin_stats,
    get_prompt_by_id,
    list_admin_prompts,
    review_prompt,
    to_detail,
)

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(require_admin)],
)


@router.get("/prompts", response_model=AdminPromptListResponse)
async def admin_prompt_list(
    prompt_status: PromptStatus | None = Query(default=None, alias="status"),
    q: str | None = Query(default=None, max_length=200),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> AdminPromptListResponse:
    return await list_admin_prompts(
        db,
        prompt_status=prompt_status.value if prompt_status else None,
        q=q,
        limit=limit,
        offset=offset,
    )


@router.post("/prompts/{prompt_id}/review", response_model=PromptDetail)
async def review(
    prompt_id: uuid.UUID,
    payload: ReviewRequest,
    db: AsyncSession = Depends(get_db),
) -> PromptDetail:
    prompt = await get_prompt_by_id(db, prompt_id)
    if prompt is None:
        raise HTTPException(status_code=404, detail="提示词不存在")

    updated = await review_prompt(
        db,
        prompt,
        action=payload.action,
        reason=payload.reason,
    )
    return to_detail(updated)


@router.get("/stats", response_model=AdminStats)
async def admin_stats(db: AsyncSession = Depends(get_db)) -> AdminStats:
    return await get_admin_stats(db)
