from fastapi import APIRouter

router = APIRouter(prefix="/meta", tags=["meta"])

PROMPT_TYPES = [
    {"value": "text_to_image", "label": "文生图", "short": "T2I"},
    {"value": "image_to_image", "label": "图生图", "short": "I2I"},
    {"value": "text_to_video", "label": "文生视频", "short": "T2V"},
    {"value": "image_to_video", "label": "图生视频", "short": "I2V"},
]

CATEGORIES = ["摄影", "插画", "3D", "设计", "电影", "动漫", "建筑", "其他"]

MODELS = [
    "Midjourney",
    "Stable Diffusion",
    "Flux",
    "DALL·E",
    "Sora",
    "Runway",
    "可灵",
    "即梦",
    "海螺",
]


@router.get("/options")
async def get_options() -> dict:
    return {
        "types": PROMPT_TYPES,
        "categories": CATEGORIES,
        "models": MODELS,
    }
