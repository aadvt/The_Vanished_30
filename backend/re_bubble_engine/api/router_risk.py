from fastapi import APIRouter
from sqlalchemy import select

from storage.db import AsyncSessionLocal
from storage.models.bubble_flags import BubbleFlag

router = APIRouter(tags=["risk"])


def _flag_to_dict(row: BubbleFlag) -> dict:
    return {
        "id": str(row.id),
        "region": row.region,
        "overall_score": row.overall_score,
        "price_income_ratio": row.price_income_ratio,
        "price_rent_ratio": row.price_rent_ratio,
        "cap_rate_spread": row.cap_rate_spread,
        "affordability_pct": row.affordability_pct,
        "narrative": row.narrative,
        "is_active": row.is_active,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


@router.get("/risk/scores")
async def get_risk_scores():
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(BubbleFlag)
            .where(BubbleFlag.is_active == True)
            .order_by(BubbleFlag.created_at.desc())
            .limit(1)
        )
        row = result.scalars().first()

    if not row:
        return {"message": "No risk scores yet. POST /api/valuate to generate."}
    return _flag_to_dict(row)


@router.get("/risk/bubble-flags")
async def get_bubble_flags():
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(BubbleFlag)
            .where(BubbleFlag.is_active == True)
            .order_by(BubbleFlag.created_at.desc())
            .limit(20)
        )
        rows = result.scalars().all()
    return [_flag_to_dict(r) for r in rows]


@router.get("/risk/scores/history")
async def get_risk_score_history():
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(BubbleFlag).order_by(BubbleFlag.created_at.desc()).limit(50)
        )
        rows = result.scalars().all()
    return [_flag_to_dict(r) for r in rows]
