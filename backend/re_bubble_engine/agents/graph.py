from langgraph.graph import StateGraph, END
from agents.state import AgentState
from agents.orchestrator import orchestrator_node
from agents.valuation_agent import valuation_node
from agents.risk_agent import risk_node
from agents.scenario_agent import scenario_node
from agents.query_agent import query_node

def route_from_orchestrator(state: AgentState):
    if state["trigger"] == "query":
        return "query"
    return "valuation"

def build_graph():
    workflow = StateGraph(AgentState)
    
    workflow.add_node("orchestrator", orchestrator_node)
    workflow.add_node("valuation", valuation_node)
    workflow.add_node("risk", risk_node)
    workflow.add_node("scenario", scenario_node)
    workflow.add_node("query", query_node)
    
    workflow.set_entry_point("orchestrator")
    
    workflow.add_conditional_edges(
        "orchestrator",
        route_from_orchestrator,
        {
            "valuation": "valuation",
            "query": "query"
        }
    )
    
    workflow.add_edge("valuation", "risk")
    workflow.add_edge("risk", "scenario")
    workflow.add_edge("scenario", END)
    workflow.add_edge("query", END)
    
    return workflow.compile()

async def run_agent_graph(initial_state: dict) -> dict:
    state = AgentState(
        trigger=initial_state.get("trigger", "full_run"),
        region=initial_state.get("region", "national"),
        macro_snapshot=None,
        valuation_result=None,
        scenario_results=None,
        risk_score=None,
        query_request=initial_state.get("query_request"),
        query_response=None,
        errors=[],
        agent_trace=[],
        run_id=initial_state.get("run_id", "local_run")
    )
    
    app = build_graph()
    final_state = await app.ainvoke(state)
    return final_state
