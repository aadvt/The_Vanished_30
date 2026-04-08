from storage.redis_client import build_macro_snapshot
from storage.db import AsyncSessionLocal
from storage.models.valuations import Valuation
from sqlalchemy import select

async def get_latest_macro_snapshot():
    return await build_macro_snapshot()

async def get_recent_valuations(limit: int = 5):
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Valuation).order_by(Valuation.created_at.desc()).limit(limit)
        )
        return result.scalars().all()
