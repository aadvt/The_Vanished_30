import time
import json
import structlog
from pydantic import BaseModel, Field
from agents.state import AgentState
from llm.router import LLMRouter
from storage.db import get_db, AsyncSessionLocal
from storage.models.bubble_flags import BubbleFlag

log = structlog.get_logger()

class RiskLLMOutput(BaseModel):
    bubble_risk_level: str = Field(description="Low, Moderate, High, or Critical")
    primary_indicators: list[str] = Field(description="List of key indicators driving the risk")
    narrative: str = Field(description="Max 3 sentences explaining the bubble risk")

async def risk_node(state: AgentState) -> dict:
    start_time = time.time()
    updates = {"errors": [], "agent_trace": []}
    try:
        val_res = state.get("valuation_result", {}) or {}
        
        p_i_ratio = val_res.get("price_to_income", {}).get("ratio") if val_res.get("price_to_income") else None
        p_r_ratio = val_res.get("price_to_rent", {}).get("ratio") if val_res.get("price_to_rent") else None
        afford_pct = val_res.get("affordability", {}).get("pct_income") if val_res.get("affordability") else None
        
        snap = state.get("macro_snapshot", {}) or {}
        repo = snap.get("repo_rate") or 6.5
        gsec = snap.get("gsec_10y_yield") or 6.83
        
        median_price = snap.get("median_home_price_inr") or 65.0
        noi = median_price * 100000 * 0.04
        cap_rate = noi / (median_price * 100000)
        cap_spread_bps = (cap_rate - (gsec / 100)) * 10000
        
        p_i_score = min(25, max(0, (p_i_ratio - 5) / 7 * 25)) if p_i_ratio else 0
        p_r_score = min(25, max(0, (p_r_ratio - 20) / 15 * 25)) if p_r_ratio else 0
        afford_score = min(25, max(0, (afford_pct - 0.35) / 0.30 * 25)) if afford_pct else 0
        spread_score = min(25, max(0, (250 - cap_spread_bps) / 250 * 25)) if cap_spread_bps else 0
        
        overall_score = int(p_i_score + p_r_score + afford_score + spread_score)
        
        with open("llm/prompts/risk_prompt.txt", "r", encoding="utf-8") as f:
            system_prompt = f.read()
            
        user_prompt = f"Snapshot: {json.dumps(snap, default=str)}\nValuation Output: {json.dumps(val_res, default=str)}\nComputed Score: {overall_score}"
        
        llm_router = LLMRouter()
        llm_output = await llm_router.complete_structured(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            output_model=RiskLLMOutput
        )
        
        # Save the Risk Profile to the database
        async with AsyncSessionLocal() as session:
            flag = BubbleFlag(
                region=state.get("region", "national"),
                overall_score=overall_score,
                price_income_ratio=p_i_ratio,
                price_rent_ratio=p_r_ratio,
                cap_rate_spread=cap_spread_bps / 100, # Store as percentage
                affordability_pct=afford_pct * 100 if afford_pct else None,
                narrative=llm_output.narrative,
                is_active=True
            )
            session.add(flag)
            await session.commit()
            log.info("bubble_flag_written", region=flag.region, score=overall_score)
        
        updates["risk_score"] = {
            "overall_score": overall_score,
            "indicator_scores": {
                "p_i_score": p_i_score,
                "p_r_score": p_r_score,
                "afford_score": afford_score,
                "spread_score": spread_score
            },
            **llm_output.model_dump()
        }
    except Exception as e:
        log.error("risk_node_failed", error=str(e))
        updates["errors"].append(f"Risk: {str(e)}")
        
    ms = int((time.time() - start_time) * 1000)
    updates["agent_trace"].append(f"risk_node: {ms}ms")
    return updates
