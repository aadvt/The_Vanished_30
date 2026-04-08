from agents.graph import run_agent_graph
from websocket.ws_schemas import ValuationUpdateMessage, RiskUpdateMessage, ScenarioUpdateMessage, AlertMessage
from sse.sse_events import SSEEvent, BUBBLE_ALERT, VALUATION_COMPLETE, GEO_UPDATE
from storage.qdrant_client import QdrantManager
from storage.redis_client import get_redis, publish_event
from utils.logger import log

async def run_agent_job():
  try:
    result = await run_agent_graph({"trigger": "full_run"})
    
    if result.get("valuation_result"):
      await publish_event("ws_broadcast", ValuationUpdateMessage(payload=result["valuation_result"]).model_dump(mode="json"))
      await publish_event("sse_alerts", SSEEvent(type=VALUATION_COMPLETE, data=result["valuation_result"]).model_dump(mode="json"))
    
    if result.get("risk_score"):
      await publish_event("ws_broadcast", RiskUpdateMessage(payload=result["risk_score"]).model_dump(mode="json"))
      score = result["risk_score"].get("overall_score", 0)
      if score > 60:
        severity = "critical" if score > 80 else "high"
        await publish_event("ws_broadcast", AlertMessage(payload=result["risk_score"], severity=severity).model_dump(mode="json"))
        await publish_event("sse_alerts", SSEEvent(type=BUBBLE_ALERT, data={**result["risk_score"], "severity": severity}).model_dump(mode="json"))
    
    if result.get("scenario_results"):
      await publish_event("ws_broadcast", ScenarioUpdateMessage(payload=result["scenario_results"]).model_dump(mode="json"))
    
    # Refresh RAG index with new valuations
    await QdrantManager().refresh_rag_index()
    
    # Invalidate geo cache — new bubble flags were written
    r = get_redis()
    await r.delete("geo:bubble_map")
    await publish_event("sse_alerts", SSEEvent(type=GEO_UPDATE, data={"message": "bubble map updated"}).model_dump(mode="json"))
    
    log.info("agent_run_job_complete", errors=result.get("errors", []))
  except Exception as e:
    log.error("agent_run_job_failed", error=str(e))
