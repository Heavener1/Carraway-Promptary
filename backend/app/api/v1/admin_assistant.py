from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_admin
from app.schemas.assistant import AssistantSettingsRead, AssistantSettingsUpdate
from app.services.assistant_service import get_admin_settings, update_admin_settings

router = APIRouter(
    prefix="/admin/assistant",
    tags=["admin"],
    dependencies=[Depends(require_admin)],
)


@router.get("/settings", response_model=AssistantSettingsRead)
async def read_assistant_settings(
    db: AsyncSession = Depends(get_db),
) -> AssistantSettingsRead:
    return await get_admin_settings(db)


@router.put("/settings", response_model=AssistantSettingsRead)
async def save_assistant_settings(
    payload: AssistantSettingsUpdate,
    db: AsyncSession = Depends(get_db),
) -> AssistantSettingsRead:
    return await update_admin_settings(db, payload)
