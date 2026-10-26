"""Create a few demo prompts in the local development database.

Run with: uv run python scripts/seed_demo.py
The script is idempotent: prompts whose title already exists are skipped.
"""

import asyncio
import io
import random
import sys
import uuid
from datetime import UTC, datetime
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from PIL import Image, ImageDraw  # noqa: E402
from sqlalchemy import select  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.core.database import SessionLocal, init_db  # noqa: E402
from app.main import seed_admin  # noqa: E402
from app.models.prompt import Prompt  # noqa: E402
from app.models.user import User  # noqa: E402
from app.schemas.prompt import (  # noqa: E402
    AssetRole,
    CreateStatus,
    MediaType,
    PromptAssetInput,
    PromptCreate,
    PromptType,
    Visibility,
)
from app.services.prompt_service import create_prompt, review_prompt  # noqa: E402


def make_image(
    colors: tuple[tuple[int, int, int], tuple[int, int, int], tuple[int, int, int]],
    size: tuple[int, int],
    variant: int,
) -> tuple[bytes, int, int]:
    width, height = size
    top, bottom, accent = colors
    image = Image.new("RGB", size)
    draw = ImageDraw.Draw(image)
    for y in range(height):
        ratio = y / max(height - 1, 1)
        color = tuple(
            round(top[index] * (1 - ratio) + bottom[index] * ratio)
            for index in range(3)
        )
        draw.line([(0, y), (width, y)], fill=color)

    overlay = Image.new("RGBA", size, (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)
    rng = random.Random(variant)
    for _ in range(9):
        x = rng.randint(-width // 3, width)
        y = rng.randint(height // 4, height + height // 4)
        radius = rng.randint(width // 12, width // 2)
        overlay_draw.ellipse(
            [x - radius, y - radius, x + radius, y + radius],
            fill=(*accent, rng.randint(16, 52)),
        )
    image = Image.alpha_composite(image.convert("RGBA"), overlay).convert("RGB")

    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue(), width, height


def store_image(data: bytes, width: int, height: int) -> str:
    now = datetime.now(UTC)
    relative_path = Path(f"{now:%Y/%m}/{uuid.uuid4().hex}.png")
    destination = settings.media_root / relative_path
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(data)
    return f"{settings.media_url_prefix}/{relative_path.as_posix()}"


DEMOS = [
    {
        "type": PromptType.text_to_image,
        "title": "赛博朋克雨夜街道",
        "description": "霓虹反射在湿漉漉的街道上，适合电影概念图与氛围练习。",
        "positive_prompt": (
            "cyberpunk street at night after rain, neon signs reflecting on wet "
            "asphalt, dense atmospheric fog, cinematic wide shot, teal and magenta "
            "lighting, highly detailed, 35mm film still"
        ),
        "negative_prompt": "daylight, clean streets, low detail, text, watermark",
        "model": "Flux",
        "params": {
            "steps": 28,
            "cfg": 3.5,
            "seed": 20261026,
            "aspect_ratio": "3:4",
        },
        "category": "电影",
        "tags": ["赛博朋克", "霓虹", "电影感"],
        "size": (900, 1200),
        "colors": ((18, 22, 50), (5, 6, 14), (255, 60, 180)),
        "variant": 1,
    },
    {
        "type": PromptType.text_to_image,
        "title": "极简产品摄影：香水瓶",
        "description": "柔光棚拍、干净背景，适合电商主图与品牌视觉。",
        "positive_prompt": (
            "minimal product photography of a glass perfume bottle on a stone "
            "pedestal, soft diffused studio light, warm beige seamless background, "
            "subtle shadow, high-end commercial still life, sharp reflections"
        ),
        "negative_prompt": "busy background, harsh shadows, low resolution",
        "model": "Midjourney",
        "params": {"steps": 30, "cfg": 4, "aspect_ratio": "4:3"},
        "category": "摄影",
        "tags": ["产品摄影", "极简", "棚拍"],
        "size": (1200, 900),
        "colors": ((242, 236, 226), (176, 166, 152), (255, 255, 255)),
        "variant": 2,
    },
    {
        "type": PromptType.image_to_image,
        "title": "浮世绘风格的海浪",
        "description": "用参考图迁移浮世绘版画风格，保留海浪构图与层次。",
        "positive_prompt": (
            "ukiyo-e woodblock print of crashing ocean waves, bold indigo outlines, "
            "flat cream sky, traditional Japanese texture, decorative foam patterns, "
            "Hokusai inspired, crisp linework"
        ),
        "negative_prompt": "photorealistic, 3d render, blurry lines",
        "model": "Stable Diffusion",
        "params": {"steps": 32, "cfg": 7, "strength": 0.62},
        "category": "插画",
        "tags": ["浮世绘", "海浪", "风格迁移"],
        "size": (1200, 800),
        "input_size": (1200, 800),
        "colors": ((26, 58, 94), (8, 20, 38), (120, 214, 230)),
        "input_colors": ((80, 110, 120), (30, 40, 55), (200, 220, 230)),
        "variant": 3,
    },
    {
        "type": PromptType.text_to_image,
        "title": "复古胶片人像",
        "description": "暖色胶片颗粒与窗边侧光，适合情绪人像参考。",
        "positive_prompt": (
            "portrait of a young woman by a window, warm afternoon sunlight, "
            "vintage 35mm film grain, soft focus, muted earth tones, natural skin "
            "texture, shallow depth of field, editorial photography"
        ),
        "negative_prompt": "plastic skin, oversharpened, neon colors, watermark",
        "model": "Flux",
        "params": {"steps": 26, "cfg": 3, "seed": 88421, "aspect_ratio": "3:4"},
        "category": "摄影",
        "tags": ["胶片", "人像", "复古"],
        "size": (900, 1200),
        "colors": ((92, 62, 50), (32, 22, 20), (238, 190, 120)),
        "variant": 4,
    },
    {
        "type": PromptType.text_to_image,
        "title": "未来主义建筑概念",
        "description": "流线型结构与冷色天光，适合建筑概念探索。",
        "positive_prompt": (
            "futuristic museum architecture, sweeping parametric curves, white "
            "concrete and glass, overcast cool daylight, wide-angle architectural "
            "photography, monumental scale, clean composition"
        ),
        "negative_prompt": "ornate details, people, cars, low quality",
        "model": "Midjourney",
        "params": {"steps": 30, "cfg": 4, "aspect_ratio": "4:3"},
        "category": "建筑",
        "tags": ["建筑", "未来主义", "概念设计"],
        "size": (1200, 900),
        "colors": ((28, 48, 68), (6, 12, 24), (120, 220, 255)),
        "variant": 5,
    },
]


async def main() -> None:
    await init_db()
    await seed_admin()

    created = 0
    async with SessionLocal() as db:
        admin = (
            await db.execute(
                select(User).where(User.email == settings.admin_email.lower())
            )
        ).scalar_one_or_none()
        if admin is None:
            raise SystemExit("Admin user was not created. Check SEED_ADMIN settings.")

        for demo in DEMOS:
            existing = await db.scalar(
                select(Prompt.id).where(Prompt.title == demo["title"])
            )
            if existing is not None:
                print(f"skip: {demo['title']}")
                continue

            assets: list[PromptAssetInput] = []
            if "input_size" in demo:
                input_data, input_width, input_height = make_image(
                    demo["input_colors"],
                    demo["input_size"],
                    demo["variant"] + 100,
                )
                assets.append(
                    PromptAssetInput(
                        url=store_image(input_data, input_width, input_height),
                        role=AssetRole.input,
                        media_type=MediaType.image,
                        width=input_width,
                        height=input_height,
                        sort_order=0,
                    )
                )

            output_data, width, height = make_image(
                demo["colors"],
                demo["size"],
                demo["variant"],
            )
            assets.append(
                PromptAssetInput(
                    url=store_image(output_data, width, height),
                    role=AssetRole.output,
                    media_type=MediaType.image,
                    width=width,
                    height=height,
                    sort_order=len(assets),
                )
            )

            payload = PromptCreate(
                type=demo["type"],
                title=demo["title"],
                description=demo["description"],
                positive_prompt=demo["positive_prompt"],
                negative_prompt=demo["negative_prompt"],
                model=demo["model"],
                params=demo["params"],
                category=demo["category"],
                tags=demo["tags"],
                assets=assets,
                status=CreateStatus.pending,
                visibility=Visibility.public,
            )
            prompt = await create_prompt(db, admin, payload)
            await review_prompt(db, prompt, action="approve")
            created += 1
            print(f"created: {prompt.title} -> /prompts/{prompt.slug}")

    print(f"done, created {created} demo prompt(s)")


if __name__ == "__main__":
    asyncio.run(main())
