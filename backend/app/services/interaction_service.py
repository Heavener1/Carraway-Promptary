import uuid

from fastapi import HTTPException
from sqlalchemy import case, delete, func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.interaction import PromptComment, PromptFavorite, PromptLike
from app.models.prompt import Prompt
from app.models.user import User
from app.schemas.common import UserPublic
from app.schemas.interaction import (
    CommentListResponse,
    CommentPublic,
    FavoriteListResponse,
    FavoriteState,
    LikeState,
)
from app.schemas.prompt import PromptStatus, Visibility
from app.services.prompt_service import PROMPT_LOAD_OPTIONS, to_summary


def ensure_interactive(prompt: Prompt) -> None:
    if prompt.status != PromptStatus.published.value:
        raise HTTPException(status_code=409, detail="仅已发布的提示词可以互动")


async def get_interaction_flags(
    db: AsyncSession,
    prompt_id: uuid.UUID,
    user_id: uuid.UUID | None,
) -> tuple[bool, bool]:
    if user_id is None:
        return False, False
    liked = (
        await db.scalar(
            select(PromptLike.id).where(
                PromptLike.user_id == user_id,
                PromptLike.prompt_id == prompt_id,
            )
        )
        is not None
    )
    favorited = (
        await db.scalar(
            select(PromptFavorite.id).where(
                PromptFavorite.user_id == user_id,
                PromptFavorite.prompt_id == prompt_id,
            )
        )
        is not None
    )
    return liked, favorited


async def set_like(
    db: AsyncSession,
    prompt: Prompt,
    user_id: uuid.UUID,
    *,
    liked: bool,
) -> LikeState:
    if liked:
        inserted = False
        try:
            async with db.begin_nested():
                db.add(PromptLike(user_id=user_id, prompt_id=prompt.id))
                await db.flush()
            inserted = True
        except IntegrityError:
            # Already liked: keep the endpoint idempotent.
            pass
        if inserted:
            await db.execute(
                update(Prompt)
                .where(Prompt.id == prompt.id)
                .values(like_count=Prompt.like_count + 1)
            )
        await db.commit()
    else:
        result = await db.execute(
            delete(PromptLike).where(
                PromptLike.user_id == user_id,
                PromptLike.prompt_id == prompt.id,
            )
        )
        if result.rowcount:
            await db.execute(
                update(Prompt)
                .where(Prompt.id == prompt.id)
                .values(
                    like_count=case(
                        (Prompt.like_count > 0, Prompt.like_count - 1),
                        else_=0,
                    )
                )
            )
        await db.commit()

    await db.refresh(prompt, ["like_count"])
    current = (
        await db.scalar(
            select(PromptLike.id).where(
                PromptLike.user_id == user_id,
                PromptLike.prompt_id == prompt.id,
            )
        )
        is not None
    )
    return LikeState(liked=current, like_count=prompt.like_count)


async def set_favorite(
    db: AsyncSession,
    prompt: Prompt,
    user_id: uuid.UUID,
    *,
    favorited: bool,
) -> FavoriteState:
    if favorited:
        inserted = False
        try:
            async with db.begin_nested():
                db.add(PromptFavorite(user_id=user_id, prompt_id=prompt.id))
                await db.flush()
            inserted = True
        except IntegrityError:
            pass
        if inserted:
            await db.execute(
                update(Prompt)
                .where(Prompt.id == prompt.id)
                .values(favorite_count=Prompt.favorite_count + 1)
            )
        await db.commit()
    else:
        result = await db.execute(
            delete(PromptFavorite).where(
                PromptFavorite.user_id == user_id,
                PromptFavorite.prompt_id == prompt.id,
            )
        )
        if result.rowcount:
            await db.execute(
                update(Prompt)
                .where(Prompt.id == prompt.id)
                .values(
                    favorite_count=case(
                        (Prompt.favorite_count > 0, Prompt.favorite_count - 1),
                        else_=0,
                    )
                )
            )
        await db.commit()

    await db.refresh(prompt, ["favorite_count"])
    current = (
        await db.scalar(
            select(PromptFavorite.id).where(
                PromptFavorite.user_id == user_id,
                PromptFavorite.prompt_id == prompt.id,
            )
        )
        is not None
    )
    return FavoriteState(favorited=current, favorite_count=prompt.favorite_count)


def to_comment(comment: PromptComment, viewer_id: uuid.UUID | None) -> CommentPublic:
    return CommentPublic(
        id=comment.id,
        content=comment.content,
        author=UserPublic.model_validate(comment.author),
        created_at=comment.created_at,
        is_mine=viewer_id is not None and comment.user_id == viewer_id,
    )


async def list_comments(
    db: AsyncSession,
    prompt_id: uuid.UUID,
    *,
    viewer_id: uuid.UUID | None = None,
    limit: int = 50,
    offset: int = 0,
) -> CommentListResponse:
    total = (
        await db.scalar(
            select(func.count())
            .select_from(PromptComment)
            .where(PromptComment.prompt_id == prompt_id)
        )
    ) or 0
    stmt = (
        select(PromptComment)
        .where(PromptComment.prompt_id == prompt_id)
        .options(selectinload(PromptComment.author))
        .order_by(PromptComment.created_at.desc(), PromptComment.id.desc())
        .limit(limit)
        .offset(offset)
    )
    rows = list((await db.execute(stmt)).scalars().all())
    return CommentListResponse(
        items=[to_comment(comment, viewer_id) for comment in rows],
        total=total,
    )


async def create_comment(
    db: AsyncSession,
    prompt: Prompt,
    user: User,
    content: str,
) -> CommentPublic:
    comment = PromptComment(
        prompt_id=prompt.id,
        user_id=user.id,
        content=content,
    )
    db.add(comment)
    await db.execute(
        update(Prompt)
        .where(Prompt.id == prompt.id)
        .values(comment_count=Prompt.comment_count + 1)
    )
    await db.commit()

    loaded = await db.scalar(
        select(PromptComment)
        .where(PromptComment.id == comment.id)
        .options(selectinload(PromptComment.author))
    )
    if loaded is None:
        raise HTTPException(status_code=500, detail="评论发布失败")
    return to_comment(loaded, user.id)


async def delete_comment(
    db: AsyncSession,
    comment: PromptComment,
    user: User,
) -> None:
    if comment.user_id != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="无权删除该评论")
    await db.delete(comment)
    await db.execute(
        update(Prompt)
        .where(Prompt.id == comment.prompt_id)
        .values(
            comment_count=case(
                (Prompt.comment_count > 0, Prompt.comment_count - 1),
                else_=0,
            )
        )
    )
    await db.commit()


async def get_comment(
    db: AsyncSession,
    comment_id: uuid.UUID,
) -> PromptComment | None:
    return await db.scalar(
        select(PromptComment).where(PromptComment.id == comment_id)
    )


async def list_favorites(
    db: AsyncSession,
    user_id: uuid.UUID,
    *,
    limit: int = 50,
    offset: int = 0,
) -> FavoriteListResponse:
    filters = (
        PromptFavorite.user_id == user_id,
        Prompt.status == PromptStatus.published.value,
        Prompt.visibility.in_(
            [Visibility.public.value, Visibility.unlisted.value]
        ),
    )
    total = (
        await db.scalar(
            select(func.count())
            .select_from(PromptFavorite)
            .join(Prompt, Prompt.id == PromptFavorite.prompt_id)
            .where(*filters)
        )
    ) or 0
    stmt = (
        select(Prompt)
        .join(PromptFavorite, PromptFavorite.prompt_id == Prompt.id)
        .where(*filters)
        .options(*PROMPT_LOAD_OPTIONS)
        .order_by(PromptFavorite.created_at.desc(), Prompt.id.desc())
        .limit(limit)
        .offset(offset)
    )
    rows = list((await db.execute(stmt)).scalars().unique().all())
    return FavoriteListResponse(
        items=[to_summary(prompt) for prompt in rows],
        total=total,
    )
