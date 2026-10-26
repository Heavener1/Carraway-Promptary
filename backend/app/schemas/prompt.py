import json
import uuid
from datetime import datetime
from enum import StrEnum
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.schemas.common import TagPublic, UserPublic


class PromptType(StrEnum):
    text_to_image = "text_to_image"
    image_to_image = "image_to_image"
    text_to_video = "text_to_video"
    image_to_video = "image_to_video"


class PromptStatus(StrEnum):
    draft = "draft"
    pending = "pending"
    published = "published"
    rejected = "rejected"


class Visibility(StrEnum):
    public = "public"
    unlisted = "unlisted"
    private = "private"


class AssetRole(StrEnum):
    input = "input"
    output = "output"


class MediaType(StrEnum):
    image = "image"
    video = "video"


class CreateStatus(StrEnum):
    draft = "draft"
    pending = "pending"


class PromptAssetInput(BaseModel):
    url: str = Field(min_length=1, max_length=1000)
    role: AssetRole = AssetRole.output
    media_type: MediaType = MediaType.image
    thumb_url: str | None = Field(default=None, max_length=1000)
    width: int | None = Field(default=None, ge=1, le=20000)
    height: int | None = Field(default=None, ge=1, le=20000)
    duration: float | None = Field(default=None, ge=0, le=3600)
    sort_order: int = Field(default=0, ge=0, le=100)

    @field_validator("url", "thumb_url")
    @classmethod
    def validate_media_url(cls, value: str | None) -> str | None:
        if value is None:
            return value
        if value.startswith(("/media/", "http://", "https://")):
            return value
        raise ValueError("媒体地址必须是 /media/ 路径或 http(s) URL")


class PromptCreate(BaseModel):
    type: PromptType
    title: str = Field(min_length=2, max_length=160)
    description: str | None = Field(default=None, max_length=2000)
    positive_prompt: str = Field(min_length=1, max_length=20000)
    negative_prompt: str | None = Field(default=None, max_length=20000)
    model: str | None = Field(default=None, max_length=80)
    params: dict[str, Any] = Field(default_factory=dict)
    category: str | None = Field(default=None, max_length=40)
    tags: list[str] = Field(default_factory=list, max_length=10)
    assets: list[PromptAssetInput] = Field(default_factory=list, max_length=12)
    status: CreateStatus = CreateStatus.pending
    visibility: Visibility = Visibility.public

    @field_validator("title", "positive_prompt")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("内容不能为空")
        return value

    @field_validator("description", "negative_prompt", "model", "category")
    @classmethod
    def strip_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None

    @model_validator(mode="after")
    def validate_params_size(self) -> "PromptCreate":
        if len(json.dumps(self.params, ensure_ascii=False)) > 5000:
            raise ValueError("参数 JSON 不能超过 5000 字符")
        return self


class PromptUpdate(BaseModel):
    type: PromptType | None = None
    title: str | None = Field(default=None, min_length=2, max_length=160)
    description: str | None = Field(default=None, max_length=2000)
    positive_prompt: str | None = Field(default=None, min_length=1, max_length=20000)
    negative_prompt: str | None = Field(default=None, max_length=20000)
    model: str | None = Field(default=None, max_length=80)
    params: dict[str, Any] | None = None
    category: str | None = Field(default=None, max_length=40)
    tags: list[str] | None = Field(default=None, max_length=10)
    assets: list[PromptAssetInput] | None = Field(default=None, max_length=12)
    status: CreateStatus | None = None
    visibility: Visibility | None = None

    @field_validator("title", "positive_prompt")
    @classmethod
    def strip_required_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if not value:
            raise ValueError("内容不能为空")
        return value

    @model_validator(mode="after")
    def validate_params_size(self) -> "PromptUpdate":
        if self.params is not None and len(json.dumps(self.params, ensure_ascii=False)) > 5000:
            raise ValueError("参数 JSON 不能超过 5000 字符")
        return self


class PromptAssetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    role: AssetRole
    media_type: MediaType
    url: str
    thumb_url: str | None = None
    width: int | None = None
    height: int | None = None
    duration: float | None = None
    sort_order: int = 0


class PromptSummary(BaseModel):
    id: uuid.UUID
    slug: str
    type: PromptType
    title: str
    description: str | None = None
    model: str | None = None
    category: str | None = None
    cover_url: str | None = None
    cover_media_type: MediaType | None = None
    author: UserPublic
    tags: list[TagPublic] = Field(default_factory=list)
    status: PromptStatus
    like_count: int = 0
    favorite_count: int = 0
    comment_count: int = 0
    view_count: int = 0
    published_at: datetime | None = None
    created_at: datetime


class PromptDetail(PromptSummary):
    positive_prompt: str
    negative_prompt: str | None = None
    params: dict[str, Any] = Field(default_factory=dict)
    visibility: Visibility
    reject_reason: str | None = None
    updated_at: datetime
    assets: list[PromptAssetOut] = Field(default_factory=list)


class PromptListResponse(BaseModel):
    items: list[PromptSummary]
    next_cursor: str | None = None


class AdminPromptListResponse(BaseModel):
    items: list[PromptSummary]
    total: int


class ReviewRequest(BaseModel):
    action: Literal["approve", "reject"]
    reason: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def require_reject_reason(self) -> "ReviewRequest":
        if self.action == "reject" and not (self.reason and self.reason.strip()):
            raise ValueError("驳回时必须填写原因")
        return self


class AdminStats(BaseModel):
    total_users: int
    total_prompts: int
    draft: int
    pending: int
    published: int
    rejected: int


class MediaUploadResponse(BaseModel):
    url: str
    media_type: MediaType
    width: int | None = None
    height: int | None = None
    size: int
    original_name: str
