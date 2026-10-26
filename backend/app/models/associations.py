from sqlalchemy import Column, ForeignKey, Table, Uuid

from app.core.database import Base

prompt_tags = Table(
    "prompt_tags",
    Base.metadata,
    Column(
        "prompt_id",
        Uuid(as_uuid=True),
        ForeignKey("prompts.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "tag_id",
        Uuid(as_uuid=True),
        ForeignKey("tags.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)
