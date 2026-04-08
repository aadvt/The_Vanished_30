import asyncio
import json
import structlog
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from storage.redis_client import get_redis
from sse.sse_events import SSEEvent, format_sse

log = structlog.get_logger()

sse_router = APIRouter()


async def _sse_generator(request: Request):
    redis = get_redis()
    pubsub = redis.pubsub()
    await pubsub.subscribe("sse_alerts")
    loop = asyncio.get_event_loop()
    last_heartbeat = loop.time()
    try:
        while True:
            if await request.is_disconnected():
                break

            now = loop.time()
            if now - last_heartbeat > 25:
                yield ": heartbeat\n\n"
                last_heartbeat = now

            message = await pubsub.get_message(
                ignore_subscribe_messages=True, timeout=0.5
            )
            if message and message["type"] == "message":
                try:
                    event_dict = json.loads(message["data"])
                    event = SSEEvent(**event_dict)
                    yield format_sse(event)
                except Exception as e:
                    log.warning("sse_parse_error", error=str(e))

            await asyncio.sleep(0.05)
    finally:
        try:
            await pubsub.unsubscribe("sse_alerts")
            await pubsub.close()
        except Exception:
            pass


@sse_router.get("/alerts/stream")
async def sse_stream(request: Request):
    return StreamingResponse(
        _sse_generator(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
