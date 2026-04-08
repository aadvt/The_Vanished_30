import time
import json
import structlog
from pydantic import BaseModel, Field
from agents.state import AgentState
from storage.redis_client import build_macro_snapshot
from calculations.ratios import RatioCalculator
from calculations.dcf import DCFEngine
from llm.router import LLMRouter

log = structlog.get_logger()

class ValuationLLMOutput(BaseModel):
    fair_value_assessment: str = Field(description="Max 3 sentences assessing the fair value.")
    key_risks: str = Field(description="Max 3 sentences outlining key risks.")
    recommendation: str = Field(description="Hold, Sell, or Buy recommendation based on analysis.")
    confidence_level: str = Field(description="High, Medium, or Low")

async def valuation_node(state: AgentState) -> dict:
    start_time = time.time()
    updates = {"errors": [], "agent_trace": []}
    try:
        snapshot = await build_macro_snapshot()
        updates["macro_snapshot"] = snapshot.model_dump()
        
        ratio_summary = RatioCalculator().compute_all(snapshot)
        
        # DCF defaults calibrated for India
        median_home_price = snapshot.median_home_price_inr or 65.0
        noi = median_home_price * 100000 * 0.04  # 4% gross yield in INR
        cpi = snapshot.cpi_yoy or 5.0
        growth_rate = max(0.02, cpi / 100 * 0.6)  # inflation-linked NOI growth
        gsec = snapshot.gsec_10y_yield or 6.83
        discount_rate = (gsec / 100) + 0.05   # G-Sec + 500bps risk premium
        
        dcf_engine = DCFEngine()
        dcf_result = dcf_engine.calculate(
            noi=noi,
            growth_rate=growth_rate,
            discount_rate=discount_rate,
            terminal_cap_rate=0.04,
            hold_years=10
        )
        
        with open("llm/prompts/valuation_prompt.txt", "r", encoding="utf-8") as f:
            system_prompt = f.read()
            
        user_prompt = f"Snapshot: {json.dumps(updates['macro_snapshot'], default=str)}\nRatios: {ratio_summary.model_dump_json()}\nDCF: {dcf_result.model_dump_json()}"
        
        llm_router = LLMRouter()
        llm_output = await llm_router.complete_structured(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            output_model=ValuationLLMOutput
        )
        
        updates["valuation_result"] = {
            **dcf_result.model_dump(),
            **ratio_summary.model_dump(),
            **llm_output.model_dump(),
            "region": state.get("region", "national")
        }
    except Exception as e:
        log.error("valuation_node_failed", error=str(e))
        updates["errors"].append(f"Valuation: {str(e)}")
        
    ms = int((time.time() - start_time) * 1000)
    updates["agent_trace"].append(f"valuation_node: {ms}ms")
    return updates
