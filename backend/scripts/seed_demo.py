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
from app.models.news import NewsArticle  # noqa: E402
from app.models.prompt import Prompt  # noqa: E402
from app.models.user import User  # noqa: E402
from app.schemas.news import NewsArticleCreate, NewsStatus  # noqa: E402
from app.schemas.prompt import (  # noqa: E402
    AssetRole,
    CreateStatus,
    MediaType,
    PromptAssetInput,
    PromptCreate,
    PromptType,
    Visibility,
)
from app.services.news_service import create_news  # noqa: E402
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

NEWS = [
    {
        "title": "示例资讯：图像模型的文字渲染正在变稳",
        "summary": (
            "（演示数据）从海报标题到界面文案，图像生成的文字准确率与排版"
            "一致性正在成为新一轮模型竞争的重点。"
        ),
        "category": "模型发布",
        "source_name": "Promptary 编辑部",
        "source_url": "https://example.com/ai-news/text-rendering",
        "featured": True,
        "colors": ((18, 32, 74), (6, 10, 28), (122, 170, 255)),
        "variant": 11,
        "content": (
            "## 为什么文字渲染重要\n\n"
            "过去一年，图像模型在光影、材质和构图上的进步已经非常明显，"
            "但海报标题、商品包装和界面文案仍然是高频失败场景。文字一旦"
            "出现错字或扭曲，整张图就很难直接用于商业交付。\n\n"
            "## 创作者的应对方式\n\n"
            "- 把关键文字放在短句或单词级别，减少模型长文本对齐压力\n"
            "- 先生成无字版面，再用设计工具完成排版\n"
            "- 保留种子与参数，针对同一构图做小步迭代\n\n"
            "## 下一步观察\n\n"
            "文字能力提升后，提示词会从“描述画面”逐渐转向“描述版面、"
            "字体气质和信息层级”。这会改变品牌视觉与电商主图的工作流。"
        ),
    },
    {
        "title": "示例资讯：视频生成的工作流正在从抽卡走向可控",
        "summary": (
            "（演示数据）首尾帧、镜头运动和局部重绘，让视频生成开始进入"
            "可重复执行的创作流程。"
        ),
        "category": "产品动态",
        "source_name": "Promptary 编辑部",
        "source_url": "https://example.com/ai-news/video-workflow",
        "featured": False,
        "colors": ((42, 20, 58), (10, 6, 18), (220, 120, 255)),
        "variant": 12,
        "content": (
            "## 从单次生成到镜头设计\n\n"
            "早期视频生成更像抽卡：写好提示词，等待一个可用的片段。现在"
            "越来越多产品开始提供首尾帧控制、镜头路径和局部重绘，创作者"
            "可以把一个镜头拆成可调整的步骤。\n\n"
            "## 一个可复用的流程\n\n"
            "- 先用图像模型确定关键帧和美术风格\n"
            "- 用首尾帧约束主体位置与镜头方向\n"
            "- 分成短片段生成，再在剪辑软件中完成节奏\n"
            "- 对失败片段只重绘局部，而不是整段重来\n\n"
            "这种流程降低了随机性，也让参数记录和版本管理变得更重要。"
        ),
    },
    {
        "title": "示例资讯：让提示词可复用的五个迭代习惯",
        "summary": (
            "（演示数据）记录变量、控制单一变化、保留失败样本，比不断"
            "堆叠形容词更容易得到稳定结果。"
        ),
        "category": "教程实践",
        "source_name": "Promptary 编辑部",
        "source_url": "https://example.com/ai-news/prompt-iteration",
        "featured": False,
        "colors": ((20, 50, 44), (6, 18, 16), (110, 240, 190)),
        "variant": 13,
        "content": (
            "## 把提示词当作实验记录\n\n"
            "高质量提示词往往不是一次写出来的，而是通过小步迭代找到的。"
            "把每次改动控制在一个变量上，才能判断究竟是什么带来了差异。\n\n"
            "## 五个习惯\n\n"
            "- 固定主体、风格、构图三段结构，避免要素互相污染\n"
            "- 记录模型、步数、CFG、种子和宽高比\n"
            "- 一次只改一个关键词或一个参数\n"
            "- 保留失败样本，标注失败原因\n"
            "- 为常用场景建立自己的基础模板\n\n"
            "当提示词可以被解释、被复现，它才真正成为可积累的创作资产。"
        ),
    },
]


async def main() -> None:
    await init_db()
    await seed_admin()

    created = 0
    created_news = 0
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

        for demo in NEWS:
            existing_news = await db.scalar(
                select(NewsArticle.id).where(NewsArticle.title == demo["title"])
            )
            if existing_news is not None:
                print(f"skip news: {demo['title']}")
                continue

            cover_data, cover_width, cover_height = make_image(
                demo["colors"],
                (1200, 630),
                demo["variant"],
            )
            article = await create_news(
                db,
                admin,
                NewsArticleCreate(
                    title=demo["title"],
                    summary=demo["summary"],
                    content=demo["content"],
                    cover_url=store_image(cover_data, cover_width, cover_height),
                    category=demo["category"],
                    source_name=demo["source_name"],
                    source_url=demo["source_url"],
                    status=NewsStatus.published,
                    is_featured=demo["featured"],
                ),
            )
            created_news += 1
            print(f"created news: {article.title} -> /news/{article.slug}")

    print(
        f"done, created {created} demo prompt(s) and "
        f"{created_news} news article(s)"
    )


if __name__ == "__main__":
    asyncio.run(main())
