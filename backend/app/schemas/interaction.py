import uuid
from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.schemas.common import UserPublic
from app.schemas.prompt import PromptSummary


class CommentCreate(BaseModel):
    content: str = Field(min_length=1, max_length=2000)

    @field_validator("content")
    @classmethod
    def clean_content(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("评论内容不能为空")
        return value


class CommentPublic(BaseModel):
    id: uuid.UUID
    content: str
    author: UserPublic
    created_at: datetime
    is_mine: bool = False


class CommentListResponse(BaseModel):
    items: list[CommentPublic]
    total: int


class LikeState(BaseModel):
    liked: bool
    like_count: int


class FavoriteState(BaseModel):
    favorited: bool
    favorite_count: int


class FavoriteListResponse(BaseModel):
    items: list[PromptSummary]
    total: int
