from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.associations import prompt_tags
from app.models.base import TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.prompt import Prompt


class Tag(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "tags"

    name: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    usage_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    prompts: Mapped[list[Prompt]] = relationship(
        secondary=prompt_tags,
        back_populates="tags",
    )
