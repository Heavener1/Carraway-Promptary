from __future__ import annotations

from sqlalchemy import Boolean, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin


class AssistantSettings(TimestampMixin, Base):
    """Singleton row holding the admin-managed AI assistant configuration."""

    __tablename__ = "assistant_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    api_url: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    api_key_ciphertext: Mapped[str | None] = mapped_column(String(4000), nullable=True)
    model: Mapped[str | None] = mapped_column(String(120), nullable=True)
    system_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
