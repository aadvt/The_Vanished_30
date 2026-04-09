from datetime import datetime
from typing import Optional, Dict, Any
from fastapi import APIRouter, Response
from pydantic import BaseModel
from sqlalchemy import select

from calculations.monte_carlo import MonteCarloEngine
from storage.db import AsyncSessionLocal
from storage.models.scenarios import ScenarioResult

# Optional dependency for PDF reporting
try:
    from utils.pdf_generator_reportlab import generate_simulation_report
    PDF_ENABLED = True
except ImportError:
    generate_simulation_report = None
    PDF_ENABLED = False

router = APIRouter(tags=["scenarios"])


class ScenarioRequest(BaseModel):
    region: Optional[str] = "Mumbai"
    rate_change_bps: Optional[float] = None
    inflation_change_pct: Optional[float] = None
    gdp_shock_pct: Optional[float] = None
    base_value_lakh: Optional[float] = 65.0
    n_simulations: Optional[int] = 1000


@router.post("/scenario/run")
async def run_scenario(request: ScenarioRequest):
    # Determine base value from request or regional defaults
    base_val_lakh = request.base_value_lakh or 65.0
    
    # Adjust yield based on region for more accurate starting points
    yield_map = {
        "mumbai": 0.035,   # 3.5%
        "bangalore": 0.045, # 4.5%
        "delhi": 0.03,      # 3.0%
        "chennai": 0.04     # 4.0%
    }
    region_key = (request.region or "mumbai").lower()
    yield_pct = yield_map.get(region_key, 0.04)

    base_value = base_val_lakh * 100_000
    base_noi = base_value * yield_pct

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
            "p5": row.p5 if hasattr(row, 'p5') else getattr(row, 'p10', 0),
            "p10": row.p10,
            "p25": row.p25,
            "p50": row.p50,
            "p75": row.p75,
            "p90": row.p90,
            "p95": row.p95 if hasattr(row, 'p95') else getattr(row, 'p90', 0),
            "prob_loss": row.prob_loss,
            "narrative": row.narrative,
            "created_at": row.created_at.isoformat() if row.created_at else None,
        }
        for row in rows
    ]


@router.post("/scenario/report")
async def get_scenario_report(data: Dict[str, Any]):
    """
    Generates a PDF report from simulation results.
    """
    if not PDF_ENABLED or generate_simulation_report is None:
        return Response(
            content="PDF reporting library (fpdf2) is not installed on this server.",
            status_code=503,
            media_type="text/plain"
        )
        
    try:
        pdf_bytes = generate_simulation_report(data)
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": 'attachment; filename="Luminous_Report.pdf"',
                "Access-Control-Expose-Headers": "Content-Disposition",
                "X-Generated-At": datetime.now().isoformat()
            }
        )
    except Exception as e:
        return Response(
            content=f"Error generating PDF: {str(e)}",
            status_code=500,
            media_type="text/plain"
        )
