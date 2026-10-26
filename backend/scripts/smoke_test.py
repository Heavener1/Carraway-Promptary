"""End-to-end smoke test against the FastAPI app using a temporary SQLite DB.

Run with: uv run python scripts/smoke_test.py
"""

import asyncio
import io
import os
import sys
import tempfile
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

TEMP_DIR = Path(tempfile.mkdtemp(prefix="promptary-smoke-"))
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{(TEMP_DIR / 'smoke.db').as_posix()}"
os.environ["MEDIA_ROOT"] = str(TEMP_DIR / "media")
os.environ["SEED_ADMIN"] = "true"
os.environ["ADMIN_EMAIL"] = "admin@example.com"
os.environ["ADMIN_PASSWORD"] = "admin123456"
os.environ["AUTO_CREATE_TABLES"] = "true"

import httpx  # noqa: E402
from PIL import Image  # noqa: E402

from app.core.database import engine, init_db  # noqa: E402
from app.main import app, seed_admin  # noqa: E402


def png_bytes() -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (64, 40), (90, 70, 180)).save(buffer, format="PNG")
    return buffer.getvalue()


async def main() -> None:
    await init_db()
    await seed_admin()

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        health = await client.get("/health")
        assert health.status_code == 200, health.text
        print("health:", health.json())

        login = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": "admin123456"},
        )
        assert login.status_code == 200, login.text
        print("admin login:", login.json()["user"]["role"])

        upload = await client.post(
            "/api/v1/media/upload",
            files={"file": ("sample.png", png_bytes(), "image/png")},
        )
        assert upload.status_code == 200, upload.text
        media = upload.json()
        print("upload:", media["url"], media["width"], media["height"])

        created = await client.post(
            "/api/v1/prompts",
            json={
                "type": "text_to_image",
                "title": "赛博朋克雨夜城市",
                "description": "霓虹雨夜中的未来城市街道",
                "positive_prompt": "cyberpunk city at night, rain, neon lights, cinematic",
                "negative_prompt": "blurry, low quality",
                "model": "Flux",
                "params": {"steps": 28, "cfg": 3.5, "seed": 12345, "aspect_ratio": "16:9"},
                "category": "电影",
                "tags": ["赛博朋克", "雨夜"],
                "assets": [
                    {
                        "url": media["url"],
                        "role": "output",
                        "media_type": "image",
                        "width": media["width"],
                        "height": media["height"],
                        "sort_order": 0,
                    }
                ],
                "status": "pending",
                "visibility": "public",
            },
        )
        assert created.status_code == 201, created.text
        prompt = created.json()
        slug = prompt["slug"]
        prompt_id = prompt["id"]
        print("created prompt:", slug, prompt["status"])

        public_list = await client.get("/api/v1/prompts")
        assert public_list.status_code == 200
        assert public_list.json()["items"] == []

        pending = await client.get("/api/v1/admin/prompts", params={"status": "pending"})
        assert pending.status_code == 200, pending.text
        assert pending.json()["total"] == 1

        reviewed = await client.post(
            f"/api/v1/admin/prompts/{prompt_id}/review",
            json={"action": "approve"},
        )
        assert reviewed.status_code == 200, reviewed.text
        assert reviewed.json()["status"] == "published"
        print("approved:", reviewed.json()["status"])

        feed = await client.get("/api/v1/prompts", params={"q": "赛博", "sort": "latest"})
        assert feed.status_code == 200, feed.text
        assert len(feed.json()["items"]) == 1
        print("search hit:", feed.json()["items"][0]["title"])

        detail = await client.get(f"/api/v1/prompts/{slug}")
        assert detail.status_code == 200, detail.text
        assert detail.json()["view_count"] >= 1
        print("detail views:", detail.json()["view_count"])

        tags = await client.get("/api/v1/tags")
        assert tags.status_code == 200
        assert {tag["name"] for tag in tags.json()["items"]} >= {"赛博朋克", "雨夜"}
        print("tags:", [tag["name"] for tag in tags.json()["items"]])

        logout = await client.post("/api/v1/auth/logout")
        assert logout.status_code == 204

        register = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "user@example.com",
                "username": "测试用户",
                "password": "password123",
            },
        )
        assert register.status_code == 201, register.text

        liked = await client.post(f"/api/v1/prompts/{slug}/like")
        assert liked.status_code == 200, liked.text
        assert liked.json() == {"liked": True, "like_count": 1}
        liked_again = await client.post(f"/api/v1/prompts/{slug}/like")
        assert liked_again.status_code == 200, liked_again.text
        assert liked_again.json()["like_count"] == 1

        favorited = await client.post(f"/api/v1/prompts/{slug}/favorite")
        assert favorited.status_code == 200, favorited.text
        assert favorited.json() == {"favorited": True, "favorite_count": 1}

        comment = await client.post(
            f"/api/v1/prompts/{slug}/comments",
            json={"content": "这个光影氛围很棒，参数也很有参考价值。"},
        )
        assert comment.status_code == 201, comment.text
        comment_id = comment.json()["id"]
        assert comment.json()["is_mine"] is True

        comments = await client.get(f"/api/v1/prompts/{slug}/comments")
        assert comments.status_code == 200, comments.text
        assert comments.json()["total"] == 1
        assert comments.json()["items"][0]["content"].startswith("这个光影")

        interactive_detail = await client.get(f"/api/v1/prompts/{slug}")
        assert interactive_detail.status_code == 200, interactive_detail.text
        interactive = interactive_detail.json()
        assert interactive["liked"] is True
        assert interactive["favorited"] is True
        assert interactive["like_count"] == 1
        assert interactive["comment_count"] == 1

        favorites = await client.get("/api/v1/users/me/favorites")
        assert favorites.status_code == 200, favorites.text
        assert favorites.json()["total"] == 1
        assert favorites.json()["items"][0]["slug"] == slug
        print("interactions: like, favorite, comment, favorites list ok")

        removed_comment = await client.delete(f"/api/v1/comments/{comment_id}")
        assert removed_comment.status_code == 204, removed_comment.text
        unliked = await client.delete(f"/api/v1/prompts/{slug}/like")
        assert unliked.status_code == 200, unliked.text
        assert unliked.json() == {"liked": False, "like_count": 0}
        unfavorited = await client.delete(f"/api/v1/prompts/{slug}/favorite")
        assert unfavorited.status_code == 200, unfavorited.text
        assert unfavorited.json() == {"favorited": False, "favorite_count": 0}

        final_detail = await client.get(f"/api/v1/prompts/{slug}")
        assert final_detail.status_code == 200, final_detail.text
        assert final_detail.json()["comment_count"] == 0

        forbidden = await client.get("/api/v1/admin/stats")
        assert forbidden.status_code == 403
        print("rbac: normal user blocked from admin stats")

    await engine.dispose()
    print("smoke test passed")


if __name__ == "__main__":
    asyncio.run(main())
