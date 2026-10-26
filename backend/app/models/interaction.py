from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, Text, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.user import User


class PromptLike(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "prompt_likes"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "prompt_id",
            name="uq_prompt_likes_user_prompt",
        ),
        Index("ix_prompt_likes_prompt_created", "prompt_id", "created_at"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
    )
    prompt_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("prompts.id", ondelete="CASCADE"),
        index=True,
    )


class PromptFavorite(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "prompt_favorites"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "prompt_id",
            name="uq_prompt_favorites_user_prompt",
        ),
        Index("ix_prompt_favorites_user_created", "user_id", "created_at"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
    )
    prompt_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("prompts.id", ondelete="CASCADE"),
        index=True,
    )


class PromptComment(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "prompt_comments"
    __table_args__ = (
        Index(
            "ix_prompt_comments_prompt_created",
            "prompt_id",
            "created_at",
        ),
    )

    prompt_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("prompts.id", ondelete="CASCADE"),
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
    )
    content: Mapped[str] = mapped_column(Text)

    author: Mapped[User] = relationship()
