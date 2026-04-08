import time
import structlog
from agents.state import AgentState
from llm.router import LLMRouter
from storage.qdrant_client import QdrantManager

log = structlog.get_logger()

async def query_node(state: AgentState) -> AgentState:
    start_time = time.time()
    updates = {"errors": [], "agent_trace": []}
    try:
        query_text = state.get("query_request")
        if not query_text:
            return {"query_response": "No query provided."}

        qdrant = QdrantManager()
        results = await qdrant.search_documents(query_text, limit=3)
        context_str = "\n".join([r.payload.get("text", "") for r in results if r.payload])

        system_prompt = "You are a real estate expert for the Indian market. Answer the user query using the provided context."
        
        # Add internal state to context
        internal_context = ""
        if state.get("macro_snapshot"):
            internal_context += f"\nMacro Snapshot: {state['macro_snapshot']}"
        if state.get("valuation_result"):
            internal_context += f"\nValuation: {state['valuation_result']}"
        if state.get("risk_score"):
            internal_context += f"\nRisk Score: {state['risk_score']}"

        user_prompt = f"Context: {context_str}\n\nInternal Engine Data: {internal_context}\n\nUser Question: {query_text}"
        
        llm_router = LLMRouter()
        response = await llm_router.complete(system_prompt, user_prompt)
        updates["query_response"] = response
        
    except Exception as e:
        log.error("query_node_failed", error=str(e))
        updates["errors"].append(f"Query: {str(e)}")
        
    ms = int((time.time() - start_time) * 1000)
    updates["agent_trace"].append(f"query_node: {ms}ms")
    return updates
