import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.cookies import clear_auth_cookies, set_auth_cookies
from app.core.database import get_db
from app.core.security import (
    decode_token,
    hash_password,
    verify_password,
)
from app.models.user import User
from app.schemas.auth import AuthResponse, LoginRequest, RegisterRequest
from app.schemas.common import UserMe

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(
    payload: RegisterRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> AuthResponse:
    existing = (
        await db.execute(
            select(User).where(
                or_(User.email == payload.email, User.username == payload.username)
            )
        )
    ).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(status_code=409, detail="邮箱或用户名已被使用")

    user = User(
        email=payload.email,
        username=payload.username,
        hashed_password=hash_password(payload.password),
        role="user",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    set_auth_cookies(response, user.id)
    return AuthResponse(user=UserMe.model_validate(user))


@router.post("/login", response_model=AuthResponse)
async def login(
    payload: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> AuthResponse:
    user = (
        await db.execute(select(User).where(User.email == payload.email))
    ).scalar_one_or_none()
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="邮箱或密码错误")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="账号已被停用")

    set_auth_cookies(response, user.id)
    return AuthResponse(user=UserMe.model_validate(user))


@router.post("/refresh", response_model=AuthResponse)
async def refresh(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> AuthResponse:
    token = request.cookies.get(settings.refresh_cookie_name)
    payload = decode_token(token, "refresh") if token else None
    if payload is None:
        clear_auth_cookies(response)
        raise HTTPException(status_code=401, detail="登录已过期，请重新登录")

    try:
        user_id = uuid.UUID(payload["sub"])
    except (ValueError, TypeError):
        clear_auth_cookies(response)
        raise HTTPException(status_code=401, detail="登录已过期，请重新登录") from None

    user = await db.get(User, user_id)
    if user is None or not user.is_active:
        clear_auth_cookies(response)
        raise HTTPException(status_code=401, detail="登录已过期，请重新登录")

    set_auth_cookies(response, user.id)
    return AuthResponse(user=UserMe.model_validate(user))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response) -> None:
    clear_auth_cookies(response)
