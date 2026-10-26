from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_name: str = "Promptary API"
    environment: str = "development"
    debug: bool = True
    api_v1_prefix: str = "/api/v1"

    secret_key: str = "dev-secret-change-me-please-use-32-bytes-min"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 30
    access_cookie_name: str = "promptary_access"
    refresh_cookie_name: str = "promptary_refresh"
    cookie_secure: bool = False
    cookie_domain: str | None = None

    database_url: str = f"sqlite+aiosqlite:///{(BASE_DIR / 'promptary.db').as_posix()}"
    auto_create_tables: bool = True

    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # "local" for development, "s3" for MinIO / R2 / AWS S3 in production.
    storage_backend: str = "local"
    media_root: Path = BASE_DIR / "media"
    media_url_prefix: str = "/media"
    max_image_mb: int = 12
    max_video_mb: int = 80

    admin_email: str = "admin@example.com"
    admin_password: str = "admin123456"
    seed_admin: bool = True

    # Public AI assistant guardrails. Values are intentionally conservative;
    # the admin-managed provider credentials live in the database instead.
    assistant_rate_limit_per_minute: int = 12
    assistant_timeout_seconds: float = 45.0
    # Enable only when a trusted reverse proxy overwrites X-Forwarded-For.
    trust_proxy_headers: bool = False

    @field_validator("media_root")
    @classmethod
    def resolve_media_root(cls, value: Path) -> Path:
        return value if value.is_absolute() else (BASE_DIR / value).resolve()

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")

    @property
    def is_production(self) -> bool:
        return self.environment.lower() in {"production", "prod"}


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
