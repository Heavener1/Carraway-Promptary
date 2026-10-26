import uuid
from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field, field_validator

from app.core.news import NEWS_CATEGORIES
from app.schemas.common import UserPublic


class NewsStatus(StrEnum):
    draft = "draft"
    published = "published"


class NewsArticleCreate(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    summary: str | None = Field(default=None, max_length=500)
    content: str = Field(min_length=10, max_length=50000)
    cover_url: str | None = Field(default=None, max_length=1000)
    category: str = Field(default="行业观察", max_length=40)
    source_name: str | None = Field(default=None, max_length=100)
    source_url: str | None = Field(default=None, max_length=1000)
    status: NewsStatus = NewsStatus.draft
    is_featured: bool = False

    @field_validator("title", "content")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("内容不能为空")
        return value

    @field_validator("summary", "source_name")
    @classmethod
    def strip_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None

    @field_validator("category")
    @classmethod
    def validate_category(cls, value: str) -> str:
        if value not in NEWS_CATEGORIES:
            raise ValueError("无效的资讯分类")
        return value

    @field_validator("cover_url")
    @classmethod
    def validate_cover_url(cls, value: str | None) -> str | None:
        return _clean_media_url(value)

    @field_validator("source_url")
    @classmethod
    def validate_source_url(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if not value:
            return None
        if not value.startswith(("http://", "https://")):
            raise ValueError("来源链接必须是 http(s) URL")
        return value


class NewsArticleUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=200)
    summary: str | None = Field(default=None, max_length=500)
    content: str | None = Field(default=None, min_length=10, max_length=50000)
    cover_url: str | None = Field(default=None, max_length=1000)
    category: str | None = Field(default=None, max_length=40)
    source_name: str | None = Field(default=None, max_length=100)
    source_url: str | None = Field(default=None, max_length=1000)
    status: NewsStatus | None = None
    is_featured: bool | None = None

    @field_validator("title", "content")
    @classmethod
    def strip_required_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if not value:
            raise ValueError("内容不能为空")
        return value

    @field_validator("summary", "source_name")
    @classmethod
    def strip_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None

    @field_validator("category")
    @classmethod
    def validate_category(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if value not in NEWS_CATEGORIES:
            raise ValueError("无效的资讯分类")
        return value

    @field_validator("cover_url")
    @classmethod
    def validate_cover_url(cls, value: str | None) -> str | None:
        return _clean_media_url(value)

    @field_validator("source_url")
    @classmethod
    def validate_source_url(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if not value:
            return None
        if not value.startswith(("http://", "https://")):
            raise ValueError("来源链接必须是 http(s) URL")
        return value


def _clean_media_url(value: str | None) -> str | None:
    if value is None:
        return None
    value = value.strip()
    if not value:
        return None
    if value.startswith(("/media/", "http://", "https://")):
        return value
    raise ValueError("封面地址必须是 /media/ 路径或 http(s) URL")


class NewsArticleSummary(BaseModel):
    id: uuid.UUID
    slug: str
    title: str
    summary: str | None = None
    cover_url: str | None = None
    category: str
    source_name: str | None = None
    source_url: str | None = None
    author: UserPublic
    status: NewsStatus
    is_featured: bool = False
    view_count: int = 0
    published_at: datetime | None = None
    created_at: datetime


class NewsArticleDetail(NewsArticleSummary):
    content: str
    updated_at: datetime


class NewsListResponse(BaseModel):
    items: list[NewsArticleSummary]
    total: int
