from ingestion.ingest_coordinator import IngestCoordinator
from websocket.ws_schemas import MacroUpdateMessage
from sse.sse_events import SSEEvent, MACRO_UPDATE
from storage.redis_client import get_redis, build_macro_snapshot, publish_event
from utils.logger import log

async def run_macro_refresh_job():
  try:
    await IngestCoordinator().run_macro_refresh()
    snapshot = await build_macro_snapshot()
    await publish_event("ws_broadcast", MacroUpdateMessage(payload=snapshot.model_dump(mode="json")).model_dump(mode="json"))
    await publish_event("sse_alerts", SSEEvent(type=MACRO_UPDATE, data=snapshot.model_dump(mode="json")).model_dump(mode="json"))
    
    # Invalidate geo cache so next map load gets fresh scores
    r = get_redis()
    await r.delete("geo:bubble_map")
    log.info("macro_refresh_job_complete")
  except Exception as e:
    log.error("macro_refresh_job_failed", error=str(e))
