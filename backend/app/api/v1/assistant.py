from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.rate_limit import SlidingWindowLimiter
from app.schemas.assistant import (
    AssistantChatRequest,
    AssistantChatResponse,
    AssistantStatus,
)
from app.services.assistant_service import generate_chat_answer, get_public_status

router = APIRouter(prefix="/assistant", tags=["assistant"])

limiter = SlidingWindowLimiter(
    limit=max(1, settings.assistant_rate_limit_per_minute),
)


@router.get("/status", response_model=AssistantStatus)
async def assistant_status(
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> AssistantStatus:
    response.headers["Cache-Control"] = "no-store"
    return await get_public_status(db)


@router.post("/chat", response_model=AssistantChatResponse)
async def assistant_chat(
    payload: AssistantChatRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> AssistantChatResponse:
    client_host = request.client.host if request.client else "unknown"
    if settings.trust_proxy_headers:
        forwarded = request.headers.get("x-forwarded-for", "")
        first = forwarded.split(",", 1)[0].strip()
        if first:
            client_host = first
    allowed, retry_after = limiter.check(client_host)
    if not allowed:
        detail = (
            "请求过于频繁，请稍后再试。"
            if payload.locale == "zh"
            else "Too many requests. Please try again shortly."
        )
        raise HTTPException(
            status_code=429,
            detail=detail,
            headers={"Retry-After": str(retry_after)},
        )

    result = await generate_chat_answer(
        db,
        message=payload.message,
        locale=payload.locale,
        history=payload.history,
    )
    response.headers["Cache-Control"] = "no-store"
    return result
