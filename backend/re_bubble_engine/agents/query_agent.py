import time
import json
import structlog
from pydantic import BaseModel
from typing import Optional

from agents.state import AgentState
from llm.router import LLMRouter
from storage.qdrant_client import QdrantManager
from calculations.monte_carlo import MonteCarloEngine

log = structlog.get_logger()

class SimulationIntent(BaseModel):
    is_simulation: bool
    rate_change_bps: Optional[float] = None
    inflation_change_pct: Optional[float] = None
    gdp_shock_pct: Optional[float] = None

async def query_node(state: AgentState) -> dict:
    start_time = time.time()
    updates = {"errors": [], "agent_trace": []}
    try:
        query_text = state.get("query_request")
        if not query_text:
            return {"query_response": "No query provided."}

        llm_router = LLMRouter()

        # 1. Intent Extraction
        intent_system_prompt = (
            "You are an intent router. Determine if the user is asking a 'What if' / hypothetical simulation question "
            "about inflation, interest rates, or GDP shocks. If they are, extract the numeric modifiers. "
            "e.g. 'inflation goes up by 50%' -> inflation_change_pct=50.0"
        )
        intent = await llm_router.complete_structured(
            system_prompt=intent_system_prompt,
            user_prompt=query_text,
            output_model=SimulationIntent,
            prefer_fast=True  # Use faster Groq/Flash for routing
        )

        if intent.is_simulation:
            log.info("query_intent_simulation", params=intent.model_dump())
            # 2. Execute True Monte Carlo
            base_value = 65.0 * 100_000
            base_noi = base_value * 0.04
            
            shock = {}
            if intent.rate_change_bps is not None: shock["rate_change_bps"] = intent.rate_change_bps
            if intent.inflation_change_pct is not None: shock["inflation_change_pct"] = intent.inflation_change_pct
            if intent.gdp_shock_pct is not None: shock["gdp_shock_pct"] = intent.gdp_shock_pct

            mc = MonteCarloEngine()
            # 10,000 simulations for high statistical confidence
            mc_result = mc.run_simulation(base_noi, base_value, shock, 10000)
            mc_dict = mc_result.model_dump()
            
            updates["mc_results"] = mc_dict

            # 3. Reasoning synthesis
            synthesis_system = (
                "You are a quantitative Risk AI. Read this statistical output from your Monte Carlo engine. "
                "Synthesize the data into a COINCISE 2-4 sentence response (max 6 lines). "
                "Explain the median (P50) and the probability of loss. "
                "Keep it professional, like a high-frequency trading terminal. Be extremely brief."
            )
            synthesis_prompt = f"User Question: {query_text}\nMonte Carlo Data (10,000 iterations): {json.dumps(mc_dict, indent=2)}"
            
            response = await llm_router.complete(synthesis_system, synthesis_prompt)
            updates["query_response"] = response

        else:
            log.info("query_intent_rag")
            # Traditional RAG Fallback
            qdrant = QdrantManager()
            results = await qdrant.search_documents(query_text, limit=3)
            context_str = "\n".join([r.payload.get("text", "") for r in results if r.payload])

            system_prompt = (
                "You are a real estate expert for the Indian market. "
                "Answer the user query using the provided context. "
                "STRICT LIMIT: Your response must be between 2 to 6 lines long. Be direct and punchy."
            )
            
            # Add internal state to context just in case
            internal_context = ""
            if state.get("macro_snapshot"): internal_context += f"\nMacro Snapshot: {state['macro_snapshot']}"
            if state.get("valuation_result"): internal_context += f"\nValuation: {state['valuation_result']}"
            if state.get("risk_score"): internal_context += f"\nRisk Score: {state['risk_score']}"

            user_prompt = f"Context: {context_str}\n\nInternal Engine Data: {internal_context}\n\nUser Question: {query_text}"
            
            response = await llm_router.complete(system_prompt, user_prompt)
            updates["query_response"] = response
            
    except Exception as e:
        log.error("query_node_failed", error=str(e))
        updates["errors"].append(f"Query: {str(e)}")
        
    ms = int((time.time() - start_time) * 1000)
    updates["agent_trace"].append(f"query_node: {ms}ms")
    return updates
