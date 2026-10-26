from pydantic import BaseModel, EmailStr, Field, field_validator

from app.schemas.common import UserMe


class RegisterRequest(BaseModel):
    email: EmailStr
    username: str = Field(min_length=2, max_length=40)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()

    @field_validator("username")
    @classmethod
    def normalize_username(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("用户名不能为空")
        if any(char.isspace() for char in value):
            raise ValueError("用户名不能包含空格")
        return value


class LoginRequest(BaseModel):
    email: EmailStr
    password: str

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()


class ProfileUpdate(BaseModel):
    username: str | None = Field(default=None, min_length=2, max_length=40)
    avatar_url: str | None = Field(default=None, max_length=500)
    bio: str | None = Field(default=None, max_length=500)

    @field_validator("username")
    @classmethod
    def normalize_username(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if not value:
            raise ValueError("用户名不能为空")
        if any(char.isspace() for char in value):
            raise ValueError("用户名不能包含空格")
        return value


class AuthResponse(BaseModel):
    user: UserMe
