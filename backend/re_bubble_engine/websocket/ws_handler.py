import asyncio
import structlog
from datetime import datetime
from fastapi import WebSocket
from starlette.websockets import WebSocketDisconnect

from websocket.ws_manager import manager
from websocket.ws_schemas import (
    MacroUpdateMessage,
    HeartbeatMessage,
    QueryResponseMessage,
)
from storage.redis_client import build_macro_snapshot
from agents.graph import run_agent_graph

log = structlog.get_logger()


async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, client_id)

    # Send snapshot immediately on connect
    try:
        snapshot = await build_macro_snapshot()
        await manager.send_to(
            client_id,
            MacroUpdateMessage(payload=snapshot.model_dump(mode="json")).model_dump(mode="json"),
        )
    except Exception as e:
        log.error("ws_initial_snapshot_failed", client_id=client_id, error=str(e))

    # Receive loop
    while True:
        try:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "query":
                question = data.get("payload", {}).get("question", "")
                asyncio.create_task(_handle_query(client_id, question))
                await manager.send_to(
                    client_id,
                    {"type": "query_acknowledged", "timestamp": datetime.utcnow().isoformat()},
                )

            elif msg_type == "refresh":
                asyncio.create_task(_handle_refresh(client_id))
                await manager.send_to(
                    client_id,
                    {"type": "refresh_started", "timestamp": datetime.utcnow().isoformat()},
                )

            elif msg_type == "ping":
                await manager.send_to(
                    client_id,
                    HeartbeatMessage().model_dump(mode="json"),
                )

        except WebSocketDisconnect:
            manager.disconnect(client_id)
            break
        except Exception as e:
            log.error("ws_receive_error", client_id=client_id, error=str(e))
            break


async def _handle_query(client_id: str, question: str):
    try:
        result = await run_agent_graph({"trigger": "query", "query_request": question})
        await manager.send_to(
            client_id,
            QueryResponseMessage(
                payload={
                    "answer": result.get("query_response"),
                    "run_id": result.get("run_id"),
                }
            ).model_dump(mode="json"),
        )
    except Exception as e:
        log.error("ws_query_handler_failed", client_id=client_id, error=str(e))


async def _handle_refresh(client_id: str):
    try:
        from ingestion.ingest_coordinator import IngestCoordinator

        await IngestCoordinator().run_macro_refresh()
        snapshot = await build_macro_snapshot()
        await manager.send_to(
            client_id,
            MacroUpdateMessage(payload=snapshot.model_dump(mode="json")).model_dump(mode="json"),
        )
    except Exception as e:
        log.error("ws_refresh_handler_failed", client_id=client_id, error=str(e))
