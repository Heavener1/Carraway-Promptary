from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    JSON,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.associations import prompt_tags
from app.models.base import TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.tag import Tag
    from app.models.user import User


class Prompt(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "prompts"
    __table_args__ = (
        Index("ix_prompts_feed_latest", "status", "visibility", "published_at"),
        Index("ix_prompts_feed_popular", "status", "visibility", "like_count"),
    )

    author_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
    )
    type: Mapped[str] = mapped_column(String(32), index=True)
    title: Mapped[str] = mapped_column(String(160))
    slug: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    positive_prompt: Mapped[str] = mapped_column(Text)
    negative_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    model: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)
    params: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    category: Mapped[str | None] = mapped_column(String(40), nullable=True, index=True)

    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)
    visibility: Mapped[str] = mapped_column(String(20), default="public")
    reject_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)

    like_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    favorite_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    comment_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    view_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    published_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )

    author: Mapped[User] = relationship(back_populates="prompts")
    assets: Mapped[list[PromptAsset]] = relationship(
        back_populates="prompt",
        cascade="all, delete-orphan",
        order_by="PromptAsset.sort_order",
    )
    tags: Mapped[list[Tag]] = relationship(
        secondary=prompt_tags,
        back_populates="prompts",
    )


class PromptAsset(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "prompt_assets"

    prompt_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("prompts.id", ondelete="CASCADE"),
        index=True,
    )
    role: Mapped[str] = mapped_column(String(16), default="output")
    media_type: Mapped[str] = mapped_column(String(16), default="image")
    url: Mapped[str] = mapped_column(String(1000))
    thumb_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    width: Mapped[int | None] = mapped_column(Integer, nullable=True)
    height: Mapped[int | None] = mapped_column(Integer, nullable=True)
    duration: Mapped[float | None] = mapped_column(Float, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    prompt: Mapped[Prompt] = relationship(back_populates="assets")
