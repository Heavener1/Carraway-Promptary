from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.auth import ProfileUpdate
from app.schemas.common import UserMe

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserMe)
async def read_me(user: User = Depends(get_current_user)) -> User:
    return user


@router.patch("/me", response_model=UserMe)
async def update_me(
    payload: ProfileUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    data = payload.model_dump(exclude_unset=True)

    username = data.get("username")
    if username is not None and username != user.username:
        existing = await db.scalar(
            select(User.id).where(User.username == username, User.id != user.id)
        )
        if existing is not None:
            raise HTTPException(status_code=409, detail="用户名已被使用")
        user.username = username

    if "avatar_url" in data:
        user.avatar_url = data["avatar_url"] or None
    if "bio" in data:
        user.bio = data["bio"] or None

    await db.commit()
    await db.refresh(user)
    return user
