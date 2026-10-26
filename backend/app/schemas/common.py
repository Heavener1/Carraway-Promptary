import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    username: str
    avatar_url: str | None = None
    bio: str | None = None


class UserMe(UserPublic):
    email: EmailStr
    role: str
    is_active: bool
    created_at: datetime


class TagPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    slug: str
    usage_count: int = 0


class TagListResponse(BaseModel):
    items: list[TagPublic]


class Message(BaseModel):
    message: str
