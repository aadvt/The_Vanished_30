import json
from uuid import uuid4
from pydantic import BaseModel, Field

# Event type constants
MACRO_UPDATE = "macro_update"
BUBBLE_ALERT = "bubble_alert"
VALUATION_COMPLETE = "valuation_complete"
SCENARIO_COMPLETE = "scenario_complete"
SYSTEM_HEALTH = "system_health"
GEO_UPDATE = "geo_update"


class SSEEvent(BaseModel):
    type: str
    data: dict
    id: str = Field(default_factory=lambda: str(uuid4()))
    retry: int = 3000


def format_sse(event: SSEEvent) -> str:
    return (
        f"id: {event.id}\n"
        f"event: {event.type}\n"
        f"data: {json.dumps(event.data)}\n"
        f"retry: {event.retry}\n\n"
    )
