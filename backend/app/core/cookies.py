import uuid

from fastapi import Response

from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token


def set_auth_cookies(response: Response, user_id: uuid.UUID) -> None:
    subject = str(user_id)
    response.set_cookie(
        key=settings.access_cookie_name,
        value=create_access_token(subject),
        max_age=settings.access_token_expire_minutes * 60,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        domain=settings.cookie_domain,
        path="/",
    )
    response.set_cookie(
        key=settings.refresh_cookie_name,
        value=create_refresh_token(subject),
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        domain=settings.cookie_domain,
        path="/",
    )


def clear_auth_cookies(response: Response) -> None:
    for key in (settings.access_cookie_name, settings.refresh_cookie_name):
        response.delete_cookie(
            key=key,
            domain=settings.cookie_domain,
            path="/",
        )
