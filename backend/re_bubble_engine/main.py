from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import asyncio
import json

from config import settings
from utils.logger import log
from storage.db import init_db
from storage.redis_client import get_redis, build_macro_snapshot
from storage.qdrant_client import QdrantManager
from websocket.ws_manager import manager
from websocket.ws_handler import websocket_endpoint
from scheduler.scheduler_setup import create_scheduler
from scheduler.jobs.job_macro_refresh import run_macro_refresh_job
from scheduler.jobs.job_agent_run import run_agent_job
from sse.sse_handler import sse_router
from api import router_market, router_valuation, router_scenario, router_risk, router_query, router_health, router_geo

@asynccontextmanager
async def lifespan(app: FastAPI):
  log.info("startup_begin")
  
  # 1. Init DB (create tables if missing)
  await init_db()
  
  # 2. Ensure Qdrant collection exists
  await QdrantManager().ensure_collection()
  
  # 3. Start Redis → WebSocket subscriber as background task
  asyncio.create_task(manager.start_redis_subscriber())
  
  # 4. Start scheduler
  scheduler = create_scheduler()
  scheduler.start()
  app.state.scheduler = scheduler
  
  log.info("startup_complete", env=settings.APP_ENV)
  yield
  
  # Shutdown
  scheduler.shutdown(wait=False)
  log.info("shutdown_complete")

app = FastAPI(
  title="India RE Bubble Detection Engine",
  description="Real-time Indian real estate bubble risk analysis",
  version="1.0.0",
  lifespan=lifespan
)

app.add_middleware(
  CORSMiddleware,
  allow_origins=["*"],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)

# REST routers
app.include_router(router_health.router)
app.include_router(router_market.router,    prefix="/api")
app.include_router(router_valuation.router, prefix="/api")
app.include_router(router_scenario.router,  prefix="/api")
app.include_router(router_risk.router,      prefix="/api")
app.include_router(router_query.router,     prefix="/api")
app.include_router(router_geo.router,       prefix="/api")

# SSE
app.include_router(sse_router, prefix="/api")

# WebSocket
app.add_api_websocket_route("/ws/{client_id}", websocket_endpoint)

# Root
@app.get("/")
async def root():
  return {"service": "India RE Bubble Engine", "status": "ok", "docs": "/docs"}
