import uuid
from datetime import UTC, datetime

from fastapi import HTTPException
from sqlalchemy import func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.news import NewsArticle
from app.models.user import User
from app.schemas.common import UserPublic
from app.schemas.news import (
    NewsArticleCreate,
    NewsArticleDetail,
    NewsArticleSummary,
    NewsArticleUpdate,
    NewsListResponse,
    NewsStatus,
)
from app.services.prompt_service import make_slug

NEWS_LOAD_OPTIONS = (selectinload(NewsArticle.author),)


def _news_filters(
    *,
    status: str | None = None,
    category: str | None = None,
    q: str | None = None,
) -> list:
    filters = []
    if status:
        filters.append(NewsArticle.status == status)
    if category:
        filters.append(NewsArticle.category == category)
    if q and q.strip():
        like = f"%{q.strip()}%"
        filters.append(
            or_(
                NewsArticle.title.ilike(like),
                NewsArticle.summary.ilike(like),
                NewsArticle.content.ilike(like),
            )
        )
    return filters


def to_summary(article: NewsArticle) -> NewsArticleSummary:
    return NewsArticleSummary(
        id=article.id,
        slug=article.slug,
        title=article.title,
        summary=article.summary,
        cover_url=article.cover_url,
        category=article.category,
        source_name=article.source_name,
        source_url=article.source_url,
        author=UserPublic.model_validate(article.author),
        status=NewsStatus(article.status),
        is_featured=article.is_featured,
        view_count=article.view_count,
        published_at=article.published_at,
        created_at=article.created_at,
    )


def to_news_detail(article: NewsArticle) -> NewsArticleDetail:
    summary = to_summary(article)
    return NewsArticleDetail(
        **summary.model_dump(),
        content=article.content,
        updated_at=article.updated_at,
    )


async def get_news_by_slug(
    db: AsyncSession,
    slug: str,
) -> NewsArticle | None:
    return await db.scalar(
        select(NewsArticle)
        .where(NewsArticle.slug == slug)
        .options(*NEWS_LOAD_OPTIONS)
    )


async def get_news_by_id(
    db: AsyncSession,
    article_id: uuid.UUID,
) -> NewsArticle | None:
    return await db.scalar(
        select(NewsArticle)
        .where(NewsArticle.id == article_id)
        .options(*NEWS_LOAD_OPTIONS)
    )


async def get_published_news(
    db: AsyncSession,
    slug: str,
) -> NewsArticle:
    article = await get_news_by_slug(db, slug)
    if article is None or article.status != NewsStatus.published.value:
        raise HTTPException(status_code=404, detail="资讯不存在")
    return article


async def list_public_news(
    db: AsyncSession,
    *,
    category: str | None = None,
    q: str | None = None,
    limit: int = 12,
    offset: int = 0,
) -> NewsListResponse:
    filters = _news_filters(
        status=NewsStatus.published.value,
        category=category,
        q=q,
    )
    total = (
        await db.scalar(
            select(func.count()).select_from(NewsArticle).where(*filters)
        )
    ) or 0
    stmt = (
        select(NewsArticle)
        .where(*filters)
        .options(*NEWS_LOAD_OPTIONS)
        .order_by(NewsArticle.published_at.desc(), NewsArticle.id.desc())
        .limit(limit)
        .offset(offset)
    )
    rows = list((await db.execute(stmt)).scalars().unique().all())
    return NewsListResponse(
        items=[to_summary(article) for article in rows],
        total=total,
    )


async def list_admin_news(
    db: AsyncSession,
    *,
    status: str | None = None,
    q: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> NewsListResponse:
    filters = _news_filters(status=status, q=q)
    total = (
        await db.scalar(
            select(func.count()).select_from(NewsArticle).where(*filters)
        )
    ) or 0
    stmt = (
        select(NewsArticle)
        .where(*filters)
        .options(*NEWS_LOAD_OPTIONS)
        .order_by(NewsArticle.created_at.desc(), NewsArticle.id.desc())
        .limit(limit)
        .offset(offset)
    )
    rows = list((await db.execute(stmt)).scalars().unique().all())
    return NewsListResponse(
        items=[to_summary(article) for article in rows],
        total=total,
    )


async def create_news(
    db: AsyncSession,
    author: User,
    data: NewsArticleCreate,
) -> NewsArticle:
    published_at = (
        datetime.now(UTC)
        if data.status == NewsStatus.published
        else None
    )
    article = NewsArticle(
        author_id=author.id,
        title=data.title,
        slug=make_slug(data.title),
        summary=data.summary,
        content=data.content,
        cover_url=data.cover_url,
        category=data.category,
        source_name=data.source_name,
        source_url=data.source_url,
        status=data.status.value,
        is_featured=data.is_featured,
        published_at=published_at,
    )
    db.add(article)
    await db.commit()

    loaded = await get_news_by_id(db, article.id)
    if loaded is None:
        raise HTTPException(status_code=500, detail="资讯创建失败")
    return loaded


async def update_news(
    db: AsyncSession,
    article: NewsArticle,
    data: NewsArticleUpdate,
) -> NewsArticle:
    payload = data.model_dump(exclude_unset=True)
    for field in (
        "title",
        "summary",
        "content",
        "cover_url",
        "category",
        "source_name",
        "source_url",
        "is_featured",
    ):
        if field in payload:
            setattr(article, field, payload[field])

    if data.status is not None:
        if (
            data.status == NewsStatus.published
            and article.status != NewsStatus.published.value
        ):
            article.published_at = datetime.now(UTC)
        article.status = data.status.value

    await db.commit()
    loaded = await get_news_by_id(db, article.id)
    if loaded is None:
        raise HTTPException(status_code=500, detail="资讯更新失败")
    return loaded


async def delete_news(db: AsyncSession, article: NewsArticle) -> None:
    await db.delete(article)
    await db.commit()


async def increment_news_view(db: AsyncSession, article: NewsArticle) -> None:
    await db.execute(
        update(NewsArticle)
        .where(NewsArticle.id == article.id)
        .values(view_count=NewsArticle.view_count + 1)
        .execution_options(synchronize_session=False)
    )
    await db.commit()
    article.view_count += 1
