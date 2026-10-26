import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, get_optional_user
from app.models.user import User
from app.schemas.interaction import (
    CommentCreate,
    CommentListResponse,
    CommentPublic,
    FavoriteListResponse,
    FavoriteState,
    LikeState,
)
from app.services.interaction_service import (
    create_comment,
    delete_comment,
    ensure_interactive,
    get_comment,
    list_comments,
    list_favorites,
    set_favorite,
    set_like,
)
from app.services.prompt_service import get_viewable_prompt

router = APIRouter(tags=["interactions"])


@router.post("/prompts/{slug}/like", response_model=LikeState)
async def like_prompt(
    slug: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> LikeState:
    prompt = await get_viewable_prompt(db, slug, user)
    ensure_interactive(prompt)
    return await set_like(db, prompt, user.id, liked=True)


@router.delete("/prompts/{slug}/like", response_model=LikeState)
async def unlike_prompt(
    slug: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> LikeState:
    prompt = await get_viewable_prompt(db, slug, user)
    return await set_like(db, prompt, user.id, liked=False)


@router.post("/prompts/{slug}/favorite", response_model=FavoriteState)
async def favorite_prompt(
    slug: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FavoriteState:
    prompt = await get_viewable_prompt(db, slug, user)
    ensure_interactive(prompt)
    return await set_favorite(db, prompt, user.id, favorited=True)


@router.delete("/prompts/{slug}/favorite", response_model=FavoriteState)
async def unfavorite_prompt(
    slug: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FavoriteState:
    prompt = await get_viewable_prompt(db, slug, user)
    return await set_favorite(db, prompt, user.id, favorited=False)


@router.get("/prompts/{slug}/comments", response_model=CommentListResponse)
async def read_comments(
    slug: str,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    viewer: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
) -> CommentListResponse:
    prompt = await get_viewable_prompt(db, slug, viewer)
    return await list_comments(
        db,
        prompt.id,
        viewer_id=viewer.id if viewer else None,
        limit=limit,
        offset=offset,
    )


@router.post(
    "/prompts/{slug}/comments",
    response_model=CommentPublic,
    status_code=status.HTTP_201_CREATED,
)
async def post_comment(
    slug: str,
    payload: CommentCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CommentPublic:
    prompt = await get_viewable_prompt(db, slug, user)
    ensure_interactive(prompt)
    return await create_comment(db, prompt, user, payload.content)


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_comment(
    comment_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    comment = await get_comment(db, comment_id)
    if comment is None:
        raise HTTPException(status_code=404, detail="评论不存在")
    await delete_comment(db, comment, user)


@router.get("/users/me/favorites", response_model=FavoriteListResponse)
async def my_favorites(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FavoriteListResponse:
    return await list_favorites(db, user.id, limit=limit, offset=offset)
