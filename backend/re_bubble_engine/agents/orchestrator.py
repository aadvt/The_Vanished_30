import time
import structlog
from agents.state import AgentState

log = structlog.get_logger()

async def orchestrator_node(state: AgentState) -> AgentState:
    start_time = time.time()
    log.info("agent_run_started", run_id=state["run_id"], trigger=state["trigger"])
    
    # Normally we would publish a Redis event here or log to DB
    # For now, just acting as an entrypoint passthrough
    
    ms = int((time.time() - start_time) * 1000)
    return {"agent_trace": [f"orchestrator_node: {ms}ms"]}
