from fastapi import APIRouter

from app.api.v1 import (
    admin,
    admin_assistant,
    assistant,
    auth,
    interactions,
    media,
    meta,
    news,
    prompts,
    tags,
    users,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(interactions.router)
api_router.include_router(prompts.router)
api_router.include_router(news.router)
api_router.include_router(tags.router)
api_router.include_router(meta.router)
api_router.include_router(media.router)
api_router.include_router(assistant.router)
api_router.include_router(admin.router)
api_router.include_router(admin_assistant.router)
