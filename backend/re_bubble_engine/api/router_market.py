import json
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter
from sqlalchemy import select, distinct

from storage.redis_client import cache_get, build_macro_snapshot
from storage.db import AsyncSessionLocal
from storage.models.macro_indicators import MacroIndicator

router = APIRouter(tags=["market"])


@router.get("/market/snapshot")
async def get_market_snapshot():
    cached = await cache_get("macro:snapshot")
    if cached:
        # cache_set stores model_dump_json() which gets double-serialised;
        # after json.loads it arrives as a string — parse once more.
        if isinstance(cached, str):
            return json.loads(cached)
        return cached
    snapshot = await build_macro_snapshot()
    return snapshot.model_dump(mode="json")


@router.get("/market/history/{series_id}")
async def get_series_history(series_id: str):
    cutoff = datetime.now(timezone.utc) - timedelta(days=90)
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(MacroIndicator)
            .where(
                MacroIndicator.series_id == series_id,
                MacroIndicator.recorded_at > cutoff,
            )
            .order_by(MacroIndicator.recorded_at.desc())
        )
        rows = result.scalars().all()

    if not rows:
        return []

    return [
        {
            "recorded_at": row.recorded_at.isoformat(),
            "value": row.value,
            "series_id": row.series_id,
            "source": row.source,
            "unit": row.unit,
        }
        for row in rows
    ]


@router.get("/market/series")
async def list_series():
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(distinct(MacroIndicator.series_id))
        )
        series_ids = result.scalars().all()
    return series_ids
