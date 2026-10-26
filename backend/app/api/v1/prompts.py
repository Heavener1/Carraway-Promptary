import uuid
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, get_optional_user
from app.models.prompt import Prompt
from app.models.user import User
from app.schemas.prompt import (
    PromptCreate,
    PromptDetail,
    PromptListResponse,
    PromptStatus,
    PromptType,
    PromptUpdate,
)
from app.services.prompt_service import (
    create_prompt,
    delete_prompt,
    get_prompt_by_id,
    get_related_prompts,
    get_viewable_prompt,
    increment_view,
    list_my_prompts,
    list_prompts,
    to_detail,
    to_summary,
    update_prompt,
)

router = APIRouter(prefix="/prompts", tags=["prompts"])

SortOption = Literal["latest", "popular", "views"]


@router.get("", response_model=PromptListResponse)
async def list_public_prompts(
    q: str | None = Query(default=None, max_length=200),
    type: PromptType | None = Query(default=None),
    tag: str | None = Query(default=None, max_length=80),
    category: str | None = Query(default=None, max_length=40),
    sort: SortOption = "latest",
    cursor: str | None = None,
    limit: int = Query(default=20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
) -> PromptListResponse:
    return await list_prompts(
        db,
        q=q,
        prompt_type=type.value if type else None,
        tag=tag,
        category=category,
        sort=sort,
        cursor=cursor,
        limit=limit,
    )


@router.get("/mine", response_model=PromptListResponse)
async def list_own_prompts(
    prompt_status: PromptStatus | None = Query(default=None, alias="status"),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PromptListResponse:
    return await list_my_prompts(
        db,
        user.id,
        prompt_status=prompt_status.value if prompt_status else None,
        limit=limit,
        offset=offset,
    )


@router.post("", response_model=PromptDetail, status_code=status.HTTP_201_CREATED)
async def create_new_prompt(
    payload: PromptCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PromptDetail:
    prompt = await create_prompt(db, user, payload)
    return to_detail(prompt)


@router.get("/{slug}/related", response_model=PromptListResponse)
async def related_prompts(
    slug: str,
    limit: int = Query(default=6, ge=1, le=12),
    viewer: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
) -> PromptListResponse:
    prompt = await get_viewable_prompt(db, slug, viewer)
    rows = await get_related_prompts(db, prompt, limit=limit)
    return PromptListResponse(items=[to_summary(row) for row in rows])


@router.get("/{slug}", response_model=PromptDetail)
async def prompt_detail(
    slug: str,
    viewer: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
) -> PromptDetail:
    prompt = await get_viewable_prompt(db, slug, viewer)
    if (
        prompt.status == PromptStatus.published.value
        and prompt.visibility == "public"
    ):
        await increment_view(db, prompt)
    return to_detail(prompt)


@router.patch("/{prompt_id}", response_model=PromptDetail)
async def edit_prompt(
    prompt_id: uuid.UUID,
    payload: PromptUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PromptDetail:
    prompt = await get_prompt_by_id(db, prompt_id)
    if prompt is None:
        raise HTTPException(status_code=404, detail="提示词不存在")
    if prompt.author_id != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="无权修改该提示词")

    updated = await update_prompt(db, prompt, payload)
    return to_detail(updated)


@router.delete("/{prompt_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_prompt(
    prompt_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    prompt: Prompt | None = await get_prompt_by_id(db, prompt_id)
    if prompt is None:
        raise HTTPException(status_code=404, detail="提示词不存在")
    if prompt.author_id != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="无权删除该提示词")
    await delete_prompt(db, prompt)
