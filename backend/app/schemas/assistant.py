import re
from datetime import datetime
from typing import Literal
from urllib.parse import urlsplit

from pydantic import BaseModel, Field, field_validator, model_validator

AssistantLocale = Literal["zh", "en"]
AssistantRole = Literal["user", "assistant"]
SourceKind = Literal["prompt", "news"]


def _clean_url(value: str | None) -> str | None:
    if value is None:
        return None
    value = value.strip()
    if not value:
        return None
    if re.search(r"[\s\x00-\x1f\x7f]", value):
        raise ValueError("接口地址不能包含空白或控制字符")
    parsed = urlsplit(value)
    if parsed.scheme not in {"http", "https"}:
        raise ValueError("接口地址必须是 http(s) URL")
    if not parsed.hostname:
        raise ValueError("接口地址缺少主机名")
    if parsed.username or parsed.password:
        raise ValueError("接口地址不能包含账号密码")
    if parsed.fragment:
        raise ValueError("接口地址不能包含 URL fragment")
    return value


class AssistantSettingsUpdate(BaseModel):
    enabled: bool | None = None
    api_url: str | None = Field(default=None, max_length=2000)
    api_key: str | None = Field(default=None, max_length=2000)
    clear_api_key: bool = False
    model: str | None = Field(default=None, max_length=120)
    system_prompt: str | None = Field(default=None, max_length=4000)

    @field_validator("api_url")
    @classmethod
    def validate_api_url(cls, value: str | None) -> str | None:
        return _clean_url(value)

    @field_validator("api_key", "model", "system_prompt")
    @classmethod
    def strip_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None

    @model_validator(mode="after")
    def reject_conflicting_key_update(self) -> "AssistantSettingsUpdate":
        if self.clear_api_key and self.api_key:
            raise ValueError("不能同时设置和清除 API Key")
        return self


class AssistantSettingsRead(BaseModel):
    enabled: bool
    api_url: str | None = None
    model: str | None = None
    has_api_key: bool = False
    api_key_masked: str | None = None
    system_prompt: str | None = None
    configured: bool = False
    updated_at: datetime | None = None


class AssistantStatus(BaseModel):
    enabled: bool
    configured: bool


class AssistantHistoryMessage(BaseModel):
    role: AssistantRole
    content: str = Field(min_length=1, max_length=2000)

    @field_validator("content")
    @classmethod
    def strip_content(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("消息不能为空")
        return value


class AssistantChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1000)
    locale: AssistantLocale = "zh"
    history: list[AssistantHistoryMessage] = Field(default_factory=list, max_length=8)

    @field_validator("message")
    @classmethod
    def strip_message(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("问题不能为空")
        return value


class AssistantSource(BaseModel):
    index: int = Field(ge=1)
    kind: SourceKind
    title: str
    path: str
    snippet: str | None = None


class AssistantChatResponse(BaseModel):
    answer: str
    sources: list[AssistantSource] = Field(default_factory=list)
