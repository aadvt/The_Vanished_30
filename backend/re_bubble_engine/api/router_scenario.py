from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import select

from calculations.monte_carlo import MonteCarloEngine
from storage.db import AsyncSessionLocal
from storage.models.scenarios import ScenarioResult

router = APIRouter(tags=["scenarios"])


class ScenarioRequest(BaseModel):
    rate_change_bps: Optional[float] = None
    inflation_change_pct: Optional[float] = None
    gdp_shock_pct: Optional[float] = None
    base_value_lakh: Optional[float] = 65.0
    n_simulations: Optional[int] = 1000


@router.post("/scenario/run")
async def run_scenario(request: ScenarioRequest):
    base_value = (request.base_value_lakh or 65.0) * 100_000
    base_noi = base_value * 0.04

    shock: dict = {}
    if request.rate_change_bps is not None:
        shock["rate_change_bps"] = request.rate_change_bps
    if request.inflation_change_pct is not None:
        shock["inflation_change_pct"] = request.inflation_change_pct
    if request.gdp_shock_pct is not None:
        shock["gdp_shock_pct"] = request.gdp_shock_pct

    result = MonteCarloEngine().run_simulation(
        base_noi, base_value, shock, request.n_simulations or 1000
    )
    return result.model_dump()


@router.get("/scenario/history")
async def scenario_history():
    async with AsyncSessionLocal() as session:
        rows_result = await session.execute(
            select(ScenarioResult).order_by(ScenarioResult.created_at.desc()).limit(5)
        )
        rows = rows_result.scalars().all()

    return [
        {
            "id": str(row.id),
            "name": row.name,
            "shock_params": row.shock_params,
            "p10": row.p10,
            "p25": row.p25,
            "p50": row.p50,
            "p75": row.p75,
            "p90": row.p90,
            "prob_loss": row.prob_loss,
            "narrative": row.narrative,
            "created_at": row.created_at.isoformat() if row.created_at else None,
        }
        for row in rows
    ]
