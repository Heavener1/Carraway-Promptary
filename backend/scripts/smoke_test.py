"""End-to-end smoke test against the FastAPI app using a temporary SQLite DB.

Run with: uv run python scripts/smoke_test.py
"""

import asyncio
import io
import json
import os
import sys
import tempfile
from pathlib import Path
from unittest.mock import patch

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

from app.core.database import SessionLocal, engine, init_db  # noqa: E402
from app.main import app, seed_admin  # noqa: E402
from app.models.assistant import AssistantSettings  # noqa: E402
from app.schemas.assistant import AssistantChatResponse  # noqa: E402
from app.services.assistant_service import generate_chat_answer  # noqa: E402


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

        news_created = await client.post(
            "/api/v1/admin/news",
            json={
                "title": "新一代图像模型发布",
                "summary": "面向创作者的图像生成能力更新。",
                "content": (
                    "## 核心变化\n\n"
                    "- 更稳定的文字渲染\n"
                    "- 更快的生成速度\n\n"
                    "## 使用建议\n\n"
                    "先从人像和产品图场景开始测试。"
                ),
                "cover_url": media["url"],
                "category": "模型发布",
                "source_name": "Promptary 编辑部",
                "source_url": "https://example.com/news/1",
                "status": "published",
                "is_featured": True,
            },
        )
        assert news_created.status_code == 201, news_created.text
        news = news_created.json()
        news_id = news["id"]
        news_slug = news["slug"]
        assert news["published_at"] is not None
        assert news["is_featured"] is True

        news_feed = await client.get("/api/v1/news")
        assert news_feed.status_code == 200, news_feed.text
        assert news_feed.json()["total"] == 1
        assert news_feed.json()["items"][0]["slug"] == news_slug

        news_detail = await client.get(f"/api/v1/news/{news_slug}")
        assert news_detail.status_code == 200, news_detail.text
        assert news_detail.json()["view_count"] >= 1
        assert "核心变化" in news_detail.json()["content"]

        unpublished = await client.patch(
            f"/api/v1/admin/news/{news_id}",
            json={"status": "draft"},
        )
        assert unpublished.status_code == 200, unpublished.text
        assert unpublished.json()["status"] == "draft"
        hidden_news = await client.get(f"/api/v1/news/{news_slug}")
        assert hidden_news.status_code == 404
        draft_news = await client.get(
            "/api/v1/admin/news",
            params={"status": "draft"},
        )
        assert draft_news.status_code == 200, draft_news.text
        assert draft_news.json()["total"] == 1

        republished = await client.patch(
            f"/api/v1/admin/news/{news_id}",
            json={"status": "published"},
        )
        assert republished.status_code == 200, republished.text
        assert republished.json()["status"] == "published"
        print("news: create, publish, detail, unpublish, republish ok")

        settings = await client.get("/api/v1/admin/assistant/settings")
        assert settings.status_code == 200, settings.text
        assert settings.json()["enabled"] is False
        assert settings.json()["has_api_key"] is False
        assert settings.json()["configured"] is False

        status_before = await client.get("/api/v1/assistant/status")
        assert status_before.status_code == 200, status_before.text
        assert status_before.json() == {"enabled": False, "configured": False}

        complete_but_off = await client.put(
            "/api/v1/admin/assistant/settings",
            json={
                "enabled": False,
                "api_url": "http://provider.test/v1/chat/completions",
                "api_key": "sk-test-secret",
                "model": "test-model",
                "system_prompt": "优先推荐站内提示词。",
            },
        )
        assert complete_but_off.status_code == 200, complete_but_off.text
        saved_settings = complete_but_off.json()
        assert saved_settings["configured"] is True
        assert saved_settings["has_api_key"] is True
        assert saved_settings["api_key_masked"].endswith("cret")
        assert "sk-test-secret" not in json.dumps(saved_settings)
        assert "sk-test-secret" not in complete_but_off.text

        async with SessionLocal() as db:
            settings_row = await db.get(AssistantSettings, 1)
            assert settings_row is not None
            assert settings_row.api_key_ciphertext
            assert settings_row.api_key_ciphertext != "sk-test-secret"
            assert "sk-test-secret" not in settings_row.api_key_ciphertext
        print("assistant: admin config stored encrypted and key is masked")

        enabled_settings = await client.put(
            "/api/v1/admin/assistant/settings",
            json={"enabled": True},
        )
        assert enabled_settings.status_code == 200, enabled_settings.text
        assert enabled_settings.json()["enabled"] is True
        status_after = await client.get("/api/v1/assistant/status")
        assert status_after.json() == {"enabled": True, "configured": True}

        async def fake_generate(
            _db,
            *,
            message,
            locale,
            history,
            transport=None,
        ):
            assert message == "推荐一个赛博朋克提示词"
            assert locale == "zh"
            return AssistantChatResponse(answer="可以看 [1]。", sources=[])

        with patch(
            "app.api.v1.assistant.generate_chat_answer",
            new=fake_generate,
        ):
            chat = await client.post(
                "/api/v1/assistant/chat",
                json={
                    "message": "推荐一个赛博朋克提示词",
                    "locale": "zh",
                    "history": [],
                },
            )
        assert chat.status_code == 200, chat.text
        assert chat.json()["answer"] == "可以看 [1]。"

        captured: dict[str, str] = {}

        def provider_handler(request: httpx.Request) -> httpx.Response:
            captured["authorization"] = request.headers.get("authorization", "")
            body = json.loads(request.content)
            captured["system"] = body["messages"][0]["content"]
            captured["model"] = body["model"]
            return httpx.Response(
                200,
                json={
                    "choices": [
                        {
                            "message": {
                                "role": "assistant",
                                "content": "可以参考站内的赛博朋克提示词 [1]。",
                            }
                        }
                    ]
                },
            )

        async with SessionLocal() as db:
            generated = await generate_chat_answer(
                db,
                message="赛博朋克雨夜的提示词",
                locale="zh",
                history=[],
                transport=httpx.MockTransport(provider_handler),
            )
        assert generated.answer.startswith("可以参考")
        assert generated.sources
        assert generated.sources[0].kind == "prompt"
        assert generated.sources[0].path.startswith("/prompts/")
        assert captured["authorization"] == "Bearer sk-test-secret"
        assert captured["model"] == "test-model"
        assert "赛博朋克雨夜城市" in captured["system"]
        assert "优先推荐站内提示词" in captured["system"]
        print("assistant: retrieval, citation sources, provider auth and model ok")

        disabled_settings = await client.put(
            "/api/v1/admin/assistant/settings",
            json={"enabled": False},
        )
        assert disabled_settings.status_code == 200, disabled_settings.text
        assert disabled_settings.json()["enabled"] is False
        disabled_status = await client.get("/api/v1/assistant/status")
        assert disabled_status.json() == {"enabled": False, "configured": True}

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
        forbidden_assistant = await client.get("/api/v1/admin/assistant/settings")
        assert forbidden_assistant.status_code == 403, forbidden_assistant.text
        forbidden_assistant_update = await client.put(
            "/api/v1/admin/assistant/settings",
            json={"enabled": True},
        )
        assert forbidden_assistant_update.status_code == 403
        forbidden_news = await client.post(
            "/api/v1/admin/news",
            json={
                "title": "普通用户不应发布的资讯",
                "content": "这段内容不应该被创建。",
                "category": "行业观察",
            },
        )
        assert forbidden_news.status_code == 403, forbidden_news.text
        print("rbac: normal user blocked from admin stats and news")

    await engine.dispose()
    print("smoke test passed")


if __name__ == "__main__":
    asyncio.run(main())
