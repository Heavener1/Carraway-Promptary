from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import SessionLocal, get_db, init_db
from app.core.security import hash_password
from app.models.user import User

settings.media_root.mkdir(parents=True, exist_ok=True)


async def seed_admin() -> None:
    async with SessionLocal() as db:
        existing = (
            await db.execute(
                select(User).where(User.email == settings.admin_email.lower())
            )
        ).scalar_one_or_none()
        if existing is not None:
            return

        base_username = settings.admin_email.split("@")[0] or "admin"
        username = base_username
        suffix = 1
        while (
            await db.execute(select(User.id).where(User.username == username))
        ).scalar_one_or_none() is not None:
            username = f"{base_username}{suffix}"
            suffix += 1

        admin = User(
            email=settings.admin_email.lower(),
            username=username,
            hashed_password=hash_password(settings.admin_password),
            role="admin",
        )
        db.add(admin)
        await db.commit()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    if settings.auto_create_tables:
        await init_db()
    if settings.seed_admin:
        await seed_admin()
    yield


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="Promptary 提示词共享社区 API",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url=f"{settings.api_v1_prefix}/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
    return response


app.include_router(api_router, prefix=settings.api_v1_prefix)
app.mount(
    settings.media_url_prefix,
    StaticFiles(directory=settings.media_root),
    name="media",
)


@app.get("/", include_in_schema=False)
async def root() -> RedirectResponse:
    return RedirectResponse(url="/docs")


@app.get("/health", tags=["system"])
async def health(db: AsyncSession = Depends(get_db)) -> dict[str, str]:
    await db.execute(text("SELECT 1"))
    return {"status": "ok", "environment": settings.environment}
