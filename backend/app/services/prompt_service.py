import base64
import json
import re
import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException
from pypinyin import lazy_pinyin
from sqlalchemy import and_, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.associations import prompt_tags
from app.models.prompt import Prompt, PromptAsset
from app.models.tag import Tag
from app.models.user import User
from app.schemas.common import TagPublic, UserPublic
from app.schemas.prompt import (
    AdminPromptListResponse,
    AdminStats,
    AssetRole,
    CreateStatus,
    MediaType,
    PromptAssetInput,
    PromptCreate,
    PromptDetail,
    PromptListResponse,
    PromptStatus,
    PromptSummary,
    PromptType,
    PromptUpdate,
    Visibility,
)

PROMPT_LOAD_OPTIONS = (
    selectinload(Prompt.author),
    selectinload(Prompt.tags),
    selectinload(Prompt.assets),
)


def make_slug(title: str) -> str:
    base = "-".join(lazy_pinyin(title.strip().lower()))
    base = re.sub(r"[^a-z0-9]+", "-", base).strip("-")[:80]
    if not base:
        base = "prompt"
    return f"{base}-{uuid.uuid4().hex[:6]}"


def _tag_slug(name: str) -> str:
    slug = "-".join(lazy_pinyin(name.strip().lower()))
    slug = re.sub(r"[^a-z0-9]+", "-", slug).strip("-")[:60]
    return slug or "tag"


async def _unique_tag_slug(db: AsyncSession, name: str) -> str:
    base = _tag_slug(name)
    candidate = base
    suffix = 2
    while await db.scalar(select(Tag.id).where(Tag.slug == candidate)):
        candidate = f"{base}-{suffix}"
        suffix += 1
    return candidate


def normalize_tag_names(names: list[str]) -> list[str]:
    result: list[str] = []
    seen: set[str] = set()
    for raw in names:
        name = raw.strip()
        if not name:
            continue
        if len(name) > 40:
            raise HTTPException(status_code=422, detail="单个标签不能超过 40 个字符")
        key = name.casefold()
        if key in seen:
            continue
        seen.add(key)
        result.append(name)
    if len(result) > 10:
        raise HTTPException(status_code=422, detail="最多只能添加 10 个标签")
    return result


async def attach_tags(db: AsyncSession, prompt: Prompt, names: list[str]) -> None:
    tags: list[Tag] = []
    for name in normalize_tag_names(names):
        tag = (
            await db.execute(
                select(Tag).where(func.lower(Tag.name) == name.casefold())
            )
        ).scalar_one_or_none()
        if tag is None:
            tag = Tag(name=name, slug=await _unique_tag_slug(db, name), usage_count=0)
            db.add(tag)
            await db.flush()
        tag.usage_count = (tag.usage_count or 0) + 1
        tags.append(tag)
    prompt.tags = tags


def _asset_from_input(item: PromptAssetInput, index: int) -> PromptAsset:
    return PromptAsset(
        role=item.role.value,
        media_type=item.media_type.value,
        url=item.url,
        thumb_url=item.thumb_url,
        width=item.width,
        height=item.height,
        duration=item.duration,
        sort_order=item.sort_order if item.sort_order else index,
    )


def _asset_inputs_from_prompt(prompt: Prompt) -> list[PromptAssetInput]:
    return [
        PromptAssetInput(
            url=asset.url,
            role=AssetRole(asset.role),
            media_type=MediaType(asset.media_type),
            thumb_url=asset.thumb_url,
            width=asset.width,
            height=asset.height,
            duration=asset.duration,
            sort_order=asset.sort_order,
        )
        for asset in prompt.assets
    ]


def validate_assets(
    prompt_type: str,
    assets: list[PromptAssetInput],
    *,
    enforce: bool = True,
) -> None:
    if not enforce:
        return

    inputs = [asset for asset in assets if asset.role == AssetRole.input]
    outputs = [asset for asset in assets if asset.role == AssetRole.output]
    input_image = any(asset.media_type == MediaType.image for asset in inputs)
    output_image = any(asset.media_type == MediaType.image for asset in outputs)
    output_video = any(asset.media_type == MediaType.video for asset in outputs)

    if prompt_type == PromptType.text_to_image.value and not output_image:
        raise HTTPException(422, "文生图至少需要一张输出图片")
    if prompt_type == PromptType.image_to_image.value:
        if not input_image:
            raise HTTPException(422, "图生图需要至少一张参考图")
        if not output_image:
            raise HTTPException(422, "图生图至少需要一张输出图片")
    if prompt_type == PromptType.text_to_video.value and not output_video:
        raise HTTPException(422, "文生视频需要至少一个输出视频")
    if prompt_type == PromptType.image_to_video.value:
        if not input_image:
            raise HTTPException(422, "图生视频需要至少一张参考图")
        if not output_video:
            raise HTTPException(422, "图生视频需要至少一个输出视频")


async def get_prompt_by_id(db: AsyncSession, prompt_id: uuid.UUID) -> Prompt | None:
    stmt = select(Prompt).where(Prompt.id == prompt_id).options(*PROMPT_LOAD_OPTIONS)
    return (await db.execute(stmt)).scalar_one_or_none()


async def get_prompt_by_slug(db: AsyncSession, slug: str) -> Prompt | None:
    stmt = select(Prompt).where(Prompt.slug == slug).options(*PROMPT_LOAD_OPTIONS)
    return (await db.execute(stmt)).scalar_one_or_none()


async def create_prompt(db: AsyncSession, author: User, data: PromptCreate) -> Prompt:
    validate_assets(
        data.type.value,
        data.assets,
        enforce=data.status == CreateStatus.pending,
    )

    prompt = Prompt(
        author_id=author.id,
        type=data.type.value,
        title=data.title,
        slug=make_slug(data.title),
        description=data.description,
        positive_prompt=data.positive_prompt,
        negative_prompt=data.negative_prompt,
        model=data.model,
        params=data.params,
        category=data.category,
        status=data.status.value,
        visibility=data.visibility.value,
        published_at=None,
    )
    for index, item in enumerate(data.assets):
        prompt.assets.append(_asset_from_input(item, index))

    await attach_tags(db, prompt, data.tags)
    db.add(prompt)
    await db.commit()

    loaded = await get_prompt_by_id(db, prompt.id)
    if loaded is None:
        raise HTTPException(500, "创建提示词失败")
    return loaded


async def update_prompt(db: AsyncSession, prompt: Prompt, data: PromptUpdate) -> Prompt:
    payload = data.model_dump(exclude_unset=True)
    editable_fields = {
        "type",
        "title",
        "description",
        "positive_prompt",
        "negative_prompt",
        "model",
        "params",
        "category",
        "tags",
        "assets",
        "visibility",
    }
    content_changed = bool(editable_fields & payload.keys())

    for field in (
        "title",
        "description",
        "positive_prompt",
        "negative_prompt",
        "model",
        "category",
    ):
        if field in payload:
            setattr(prompt, field, payload[field])
    if payload.get("type") is not None:
        prompt.type = data.type.value  # type: ignore[union-attr]
    if payload.get("params") is not None:
        prompt.params = data.params
    if payload.get("visibility") is not None:
        prompt.visibility = data.visibility.value  # type: ignore[union-attr]

    if "assets" in payload and data.assets is not None:
        prompt.assets.clear()
        for index, item in enumerate(data.assets):
            prompt.assets.append(_asset_from_input(item, index))

    if "tags" in payload and data.tags is not None:
        for old_tag in list(prompt.tags):
            old_tag.usage_count = max(0, (old_tag.usage_count or 0) - 1)
        prompt.tags = []
        await attach_tags(db, prompt, data.tags)

    target_status = prompt.status
    if data.status is not None:
        target_status = data.status.value
    if prompt.status == PromptStatus.published.value and content_changed:
        target_status = PromptStatus.pending.value
        prompt.published_at = None

    current_assets = (
        data.assets
        if "assets" in payload and data.assets is not None
        else _asset_inputs_from_prompt(prompt)
    )
    validate_assets(
        prompt.type,
        current_assets,
        enforce=target_status == PromptStatus.pending.value,
    )
    prompt.status = target_status
    if target_status == PromptStatus.pending.value:
        prompt.reject_reason = None

    await db.commit()
    loaded = await get_prompt_by_id(db, prompt.id)
    if loaded is None:
        raise HTTPException(500, "更新提示词失败")
    return loaded


async def delete_prompt(db: AsyncSession, prompt: Prompt) -> None:
    for tag in prompt.tags:
        tag.usage_count = max(0, (tag.usage_count or 0) - 1)
    await db.delete(prompt)
    await db.commit()


def _pick_cover(prompt: Prompt) -> tuple[str | None, str | None]:
    outputs = [asset for asset in prompt.assets if asset.role == AssetRole.output.value]
    inputs = [asset for asset in prompt.assets if asset.role == AssetRole.input.value]
    candidates = outputs + inputs
    for asset in candidates:
        if asset.media_type == MediaType.image.value:
            return asset.url, MediaType.image.value
    for asset in candidates:
        if asset.media_type == MediaType.video.value:
            if asset.thumb_url:
                return asset.thumb_url, MediaType.image.value
            return asset.url, MediaType.video.value
    return None, None


def to_summary(prompt: Prompt) -> PromptSummary:
    cover_url, cover_media_type = _pick_cover(prompt)
    return PromptSummary(
        id=prompt.id,
        slug=prompt.slug,
        type=PromptType(prompt.type),
        title=prompt.title,
        description=prompt.description,
        model=prompt.model,
        category=prompt.category,
        cover_url=cover_url,
        cover_media_type=MediaType(cover_media_type) if cover_media_type else None,
        author=UserPublic.model_validate(prompt.author),
        tags=[TagPublic.model_validate(tag) for tag in prompt.tags],
        status=PromptStatus(prompt.status),
        like_count=prompt.like_count,
        favorite_count=prompt.favorite_count,
        comment_count=prompt.comment_count,
        view_count=prompt.view_count,
        published_at=prompt.published_at,
        created_at=prompt.created_at,
    )


def to_detail(prompt: Prompt) -> PromptDetail:
    summary = to_summary(prompt)
    return PromptDetail(
        **summary.model_dump(),
        positive_prompt=prompt.positive_prompt,
        negative_prompt=prompt.negative_prompt,
        params=prompt.params or {},
        visibility=Visibility(prompt.visibility),
        reject_reason=prompt.reject_reason,
        updated_at=prompt.updated_at,
        assets=sorted(prompt.assets, key=lambda asset: asset.sort_order),
    )


def _encode_cursor(values: list[Any]) -> str:
    raw = json.dumps(values, ensure_ascii=False).encode()
    return base64.urlsafe_b64encode(raw).decode().rstrip("=")


def _decode_cursor(cursor: str) -> list[Any]:
    try:
        padded = cursor + "=" * (-len(cursor) % 4)
        values = json.loads(base64.urlsafe_b64decode(padded.encode()).decode())
        if not isinstance(values, list):
            raise ValueError
        return values
    except Exception:
        raise HTTPException(status_code=400, detail="无效的分页游标") from None


def _apply_cursor(stmt, sort: str, cursor: str | None):
    if not cursor:
        return stmt
    values = _decode_cursor(cursor)
    try:
        last_id = uuid.UUID(values[1])
        if sort == "popular":
            metric = int(values[0])
            return stmt.where(
                or_(
                    Prompt.like_count < metric,
                    and_(Prompt.like_count == metric, Prompt.id < last_id),
                )
            )
        if sort == "views":
            metric = int(values[0])
            return stmt.where(
                or_(
                    Prompt.view_count < metric,
                    and_(Prompt.view_count == metric, Prompt.id < last_id),
                )
            )
        published_at = datetime.fromisoformat(values[0])
        return stmt.where(
            or_(
                Prompt.published_at < published_at,
                and_(Prompt.published_at == published_at, Prompt.id < last_id),
            )
        )
    except (ValueError, TypeError, IndexError):
        raise HTTPException(status_code=400, detail="无效的分页游标") from None


def _build_cursor(prompt: Prompt, sort: str) -> str | None:
    if sort in {"popular", "views"}:
        metric = prompt.like_count if sort == "popular" else prompt.view_count
        return _encode_cursor([metric, str(prompt.id)])
    if prompt.published_at is None:
        return None
    return _encode_cursor([prompt.published_at.isoformat(), str(prompt.id)])


async def list_prompts(
    db: AsyncSession,
    *,
    q: str | None = None,
    prompt_type: str | None = None,
    tag: str | None = None,
    category: str | None = None,
    sort: str = "latest",
    cursor: str | None = None,
    limit: int = 20,
) -> PromptListResponse:
    stmt = select(Prompt).where(
        Prompt.status == PromptStatus.published.value,
        Prompt.visibility == Visibility.public.value,
    )
    if prompt_type:
        stmt = stmt.where(Prompt.type == prompt_type)
    if category:
        stmt = stmt.where(Prompt.category == category)
    if tag:
        stmt = stmt.join(Prompt.tags).where(Tag.slug == tag)
    if q and q.strip():
        like = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                Prompt.title.ilike(like),
                Prompt.positive_prompt.ilike(like),
                Prompt.description.ilike(like),
            )
        )

    if sort == "popular":
        stmt = stmt.order_by(Prompt.like_count.desc(), Prompt.id.desc())
    elif sort == "views":
        stmt = stmt.order_by(Prompt.view_count.desc(), Prompt.id.desc())
    else:
        sort = "latest"
        stmt = stmt.order_by(Prompt.published_at.desc(), Prompt.id.desc())

    stmt = _apply_cursor(stmt, sort, cursor)
    stmt = stmt.options(*PROMPT_LOAD_OPTIONS).limit(limit + 1)
    rows = list((await db.execute(stmt)).scalars().unique().all())

    next_cursor = None
    if len(rows) > limit:
        rows = rows[:limit]
        next_cursor = _build_cursor(rows[-1], sort)

    return PromptListResponse(
        items=[to_summary(prompt) for prompt in rows],
        next_cursor=next_cursor,
    )


async def list_my_prompts(
    db: AsyncSession,
    user_id: uuid.UUID,
    *,
    prompt_status: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> PromptListResponse:
    filters = [Prompt.author_id == user_id]
    if prompt_status:
        filters.append(Prompt.status == prompt_status)
    stmt = (
        select(Prompt)
        .where(*filters)
        .options(*PROMPT_LOAD_OPTIONS)
        .order_by(Prompt.created_at.desc(), Prompt.id.desc())
        .limit(limit)
        .offset(offset)
    )
    rows = list((await db.execute(stmt)).scalars().unique().all())
    return PromptListResponse(items=[to_summary(prompt) for prompt in rows])


async def list_admin_prompts(
    db: AsyncSession,
    *,
    prompt_status: str | None = None,
    q: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> AdminPromptListResponse:
    filters = []
    if prompt_status:
        filters.append(Prompt.status == prompt_status)
    if q and q.strip():
        like = f"%{q.strip()}%"
        filters.append(
            or_(Prompt.title.ilike(like), Prompt.positive_prompt.ilike(like))
        )

    total = (
        await db.scalar(select(func.count()).select_from(Prompt).where(*filters))
    ) or 0
    stmt = (
        select(Prompt)
        .where(*filters)
        .options(*PROMPT_LOAD_OPTIONS)
        .order_by(Prompt.created_at.desc(), Prompt.id.desc())
        .limit(limit)
        .offset(offset)
    )
    rows = list((await db.execute(stmt)).scalars().unique().all())
    return AdminPromptListResponse(
        items=[to_summary(prompt) for prompt in rows],
        total=total,
    )


async def review_prompt(
    db: AsyncSession,
    prompt: Prompt,
    *,
    action: str,
    reason: str | None = None,
) -> Prompt:
    if action == "approve":
        prompt.status = PromptStatus.published.value
        prompt.published_at = datetime.now(UTC)
        prompt.reject_reason = None
    else:
        prompt.status = PromptStatus.rejected.value
        prompt.reject_reason = reason
    await db.commit()
    loaded = await get_prompt_by_id(db, prompt.id)
    if loaded is None:
        raise HTTPException(500, "审核失败")
    return loaded


async def increment_view(db: AsyncSession, prompt: Prompt) -> None:
    await db.execute(
        update(Prompt)
        .where(Prompt.id == prompt.id)
        .values(view_count=Prompt.view_count + 1)
        .execution_options(synchronize_session=False)
    )
    await db.commit()
    prompt.view_count += 1


async def get_related_prompts(
    db: AsyncSession,
    prompt: Prompt,
    *,
    limit: int = 6,
) -> list[Prompt]:
    rows: list[Prompt] = []
    seen_ids = {prompt.id}

    if prompt.tags:
        tag_ids = [tag.id for tag in prompt.tags]
        stmt = (
            select(Prompt)
            .join(Prompt.tags)
            .where(
                Prompt.status == PromptStatus.published.value,
                Prompt.visibility == Visibility.public.value,
                Prompt.id != prompt.id,
                Tag.id.in_(tag_ids),
            )
            .options(*PROMPT_LOAD_OPTIONS)
            .order_by(Prompt.like_count.desc(), Prompt.published_at.desc())
            .limit(limit * 3)
        )
        for row in (await db.execute(stmt)).scalars().unique().all():
            if row.id not in seen_ids:
                rows.append(row)
                seen_ids.add(row.id)

    if len(rows) < limit:
        stmt = (
            select(Prompt)
            .where(
                Prompt.status == PromptStatus.published.value,
                Prompt.visibility == Visibility.public.value,
                Prompt.type == prompt.type,
                Prompt.id.notin_(seen_ids),
            )
            .options(*PROMPT_LOAD_OPTIONS)
            .order_by(Prompt.like_count.desc(), Prompt.published_at.desc())
            .limit(limit - len(rows))
        )
        rows.extend((await db.execute(stmt)).scalars().unique().all())

    return rows[:limit]


async def get_viewable_prompt(
    db: AsyncSession,
    slug: str,
    viewer: User | None,
) -> Prompt:
    prompt = await get_prompt_by_slug(db, slug)
    if prompt is None:
        raise HTTPException(status_code=404, detail="提示词不存在")

    is_owner = viewer is not None and viewer.id == prompt.author_id
    is_admin = viewer is not None and viewer.role == "admin"
    is_public = (
        prompt.status == PromptStatus.published.value
        and prompt.visibility in {Visibility.public.value, Visibility.unlisted.value}
    )
    if not (is_public or is_owner or is_admin):
        raise HTTPException(status_code=404, detail="提示词不存在")
    return prompt


async def list_tags(
    db: AsyncSession,
    *,
    limit: int = 30,
    q: str | None = None,
) -> list[TagPublic]:
    prompt_count = func.count(prompt_tags.c.prompt_id)
    stmt = (
        select(Tag, prompt_count.label("prompt_count"))
        .outerjoin(prompt_tags, Tag.id == prompt_tags.c.tag_id)
        .group_by(Tag.id)
        .order_by(prompt_count.desc(), Tag.name.asc())
        .limit(limit)
    )
    if q and q.strip():
        stmt = stmt.where(Tag.name.ilike(f"%{q.strip()}%"))

    rows = (await db.execute(stmt)).all()
    return [
        TagPublic(
            id=tag.id,
            name=tag.name,
            slug=tag.slug,
            usage_count=count,
        )
        for tag, count in rows
    ]


async def get_admin_stats(db: AsyncSession) -> AdminStats:
    rows = (
        await db.execute(select(Prompt.status, func.count()).group_by(Prompt.status))
    ).all()
    counts = {status_value: count for status_value, count in rows}
    total_users = (await db.scalar(select(func.count()).select_from(User))) or 0
    return AdminStats(
        total_users=total_users,
        total_prompts=sum(counts.values()),
        draft=counts.get(PromptStatus.draft.value, 0),
        pending=counts.get(PromptStatus.pending.value, 0),
        published=counts.get(PromptStatus.published.value, 0),
        rejected=counts.get(PromptStatus.rejected.value, 0),
    )
