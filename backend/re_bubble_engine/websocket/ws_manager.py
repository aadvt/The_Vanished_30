import asyncio
import json
import structlog
from fastapi import WebSocket
from starlette.websockets import WebSocketDisconnect
from storage.redis_client import get_redis

log = structlog.get_logger()


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket
        log.info("ws_connected", client_id=client_id)

    def disconnect(self, client_id: str):
        self.active_connections.pop(client_id, None)
        log.info("ws_disconnected", client_id=client_id)

    async def broadcast(self, message: dict):
        payload = json.dumps(message, default=str)
        dead: list[str] = []
        for client_id, ws in self.active_connections.items():
            try:
                await ws.send_text(payload)
            except (WebSocketDisconnect, Exception):
                dead.append(client_id)
        for client_id in dead:
            self.disconnect(client_id)

    async def send_to(self, client_id: str, message: dict):
        ws = self.active_connections.get(client_id)
        if not ws:
            return
        try:
            await ws.send_text(json.dumps(message, default=str))
        except Exception:
            self.disconnect(client_id)

    async def start_redis_subscriber(self):
        while True:
            try:
                redis = get_redis()
                pubsub = redis.pubsub()
                await pubsub.subscribe("ws_broadcast")
                log.info("ws_redis_subscriber_started")
                while True:
                    try:
                        message = await pubsub.get_message(
                            ignore_subscribe_messages=True, timeout=1.0
                        )
                        if message and message["type"] == "message":
                            await self.broadcast(json.loads(message["data"]))
                        await asyncio.sleep(0.01)
                    except Exception as e:
                        log.error("ws_redis_message_error", error=str(e))
                        await asyncio.sleep(2)
            except Exception as e:
                log.error("ws_redis_subscriber_crashed", error=str(e))
                await asyncio.sleep(2)


manager = ConnectionManager()
