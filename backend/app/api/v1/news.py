from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.news import NewsArticleDetail, NewsListResponse
from app.services.news_service import (
    get_published_news,
    increment_news_view,
    list_public_news,
    to_news_detail,
)

router = APIRouter(prefix="/news", tags=["news"])


@router.get("", response_model=NewsListResponse)
async def list_news(
    q: str | None = Query(default=None, max_length=200),
    category: str | None = Query(default=None, max_length=40),
    limit: int = Query(default=12, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> NewsListResponse:
    return await list_public_news(
        db,
        category=category,
        q=q,
        limit=limit,
        offset=offset,
    )


@router.get("/{slug}", response_model=NewsArticleDetail)
async def news_detail(
    slug: str,
    track_view: bool = Query(default=True),
    db: AsyncSession = Depends(get_db),
) -> NewsArticleDetail:
    article = await get_published_news(db, slug)
    # Metadata generation and crawler prefetches can pass track_view=false so
    # one rendered page view is counted once, by the page request.
    if track_view:
        await increment_news_view(db, article)
    return to_news_detail(article)
