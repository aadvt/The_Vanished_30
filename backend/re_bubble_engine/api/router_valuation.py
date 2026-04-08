from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import select

from agents.graph import run_agent_graph
from storage.db import AsyncSessionLocal
from storage.models.valuations import Valuation

router = APIRouter(tags=["valuation"])


class ValuationRequest(BaseModel):
    region: str = "national"
    property_value_lakh: Optional[float] = None
    noi_annual: Optional[float] = None


@router.post("/valuate")
async def run_valuation(request: ValuationRequest):
    result = await run_agent_graph({"trigger": "full_run", "region": request.region})
    if result.get("errors"):
        raise HTTPException(
            status_code=500,
            detail={"errors": result["errors"]},
        )
    return {
        "valuation": result.get("valuation_result"),
        "risk_score": result.get("risk_score"),
        "agent_trace": result.get("agent_trace"),
    }


@router.get("/valuations")
async def list_valuations():
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Valuation).order_by(Valuation.created_at.desc()).limit(10)
        )
        rows = result.scalars().all()

    return [
        {
            "id": str(row.id),
            "region": row.region,
            "property_value": row.property_value,
            "dcf_value": row.dcf_value,
            "cap_rate": row.cap_rate,
            "risk_score": row.risk_score,
            "narrative": row.narrative,
            "created_at": row.created_at.isoformat() if row.created_at else None,
        }
        for row in rows
    ]
