import time
import json
import asyncio
import structlog
from pydantic import BaseModel, Field
from agents.state import AgentState
from llm.router import LLMRouter
from calculations.monte_carlo import MonteCarloEngine
from storage.db import AsyncSessionLocal
from storage.models.scenarios import ScenarioResult

log = structlog.get_logger()

class ScenarioLLMOutput(BaseModel):
    scenario_name: str = Field(description="Name of the scenario")
    impact_summary: str = Field(description="Translates the shock and percentile spreads into clear English")
    worst_case: str = Field(description="Specifically explains the p10 outcome")
    base_case: str = Field(description="Explains the p50 outcome")
    probability_assessment: str = Field(description="Qualitative assessment of probability_below_current")

async def scenario_node(state: AgentState) -> AgentState:
    start_time = time.time()
    updates = {"errors": [], "agent_trace": []}
    try:
        snap = state.get("macro_snapshot", {}) or {}
        base_value = (snap.get("median_home_price_inr") or 65.0) * 100000
        base_noi = base_value * 0.04
        
        cpi = snap.get("cpi_yoy") or 5.0
        gsec = snap.get("gsec_10y_yield") or 6.83
        
        base_growth = max(0.02, cpi / 100 * 0.6)
        base_discount = (gsec / 100) + 0.05
        
        scenarios = [
            {"name": "rbi_rate_hike_75bps",  "shock": {"rate_change_bps": 75}},
            {"name": "inflation_persistence", "shock": {"inflation_change_pct": 2.0}},
            {"name": "it_sector_slowdown",    "shock": {"gdp_shock_pct": -1.5, "rate_change_bps": 50}},
        ]
        
        with open("llm/prompts/scenario_prompt.txt", "r", encoding="utf-8") as f:
            system_prompt = f.read()
            
        llm_router = LLMRouter()
        
        async def process_scenario(sc):
            mc_engine = MonteCarloEngine()
            out = mc_engine.run_simulation(
                base_noi=base_noi,
                base_value=base_value,
                shock_scenario=sc["shock"],
                n_simulations=1000
            )
            mc_result = out.model_dump()
            
            user_prompt = f"Scenario: {sc['name']}\nShock: {sc['shock']}\nMonte Carlo Outputs: {json.dumps(mc_result)}"
            
            llm_output = await llm_router.complete_structured(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                output_model=ScenarioLLMOutput,
                prefer_fast=True
            )
            
            final_res = {
                "name": sc["name"],
                "shock_params": sc["shock"],
                "monte_carlo": mc_result,
                "llm_analysis": llm_output.model_dump()
            }
            
            async with AsyncSessionLocal() as session:
                rec = ScenarioResult(
                    name=sc["name"],
                    shock_params=sc["shock"],
                    p10=mc_result["p10"],
                    p25=mc_result["p25"],
                    p50=mc_result["p50"],
                    p75=mc_result["p75"],
                    p90=mc_result["p90"],
                    prob_loss=mc_result["prob_below_current"],
                    narrative=llm_output.impact_summary
                )
                session.add(rec)
                await session.commit()
                
            return final_res

        results_list = await asyncio.gather(*(process_scenario(sc) for sc in scenarios), return_exceptions=True)
        
        valid_results = []
        for r in results_list:
            if isinstance(r, Exception):
                log.error("scenario_error", error=str(r))
                updates["errors"].append(f"Scenario subtask error: {str(r)}")
            else:
                valid_results.append(r)
                
        updates["scenario_results"] = valid_results
    except Exception as e:
        log.error("scenario_node_failed", error=str(e))
        updates["errors"].append(f"Scenarios: {str(e)}")
        
    ms = int((time.time() - start_time) * 1000)
    updates["agent_trace"].append(f"scenario_node: {ms}ms")
    return updates
