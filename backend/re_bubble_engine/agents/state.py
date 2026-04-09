from typing import TypedDict, Optional, Annotated
import operator

class AgentState(TypedDict):
    trigger: str                                         # "full_run" or "query"
    region: str
    macro_snapshot: Optional[dict]
    valuation_result: Optional[dict]
    scenario_results: Optional[list]
    risk_score: Optional[dict]
    query_request: Optional[str]
    query_response: Optional[str]
    mc_results: Optional[dict]
    errors: Annotated[list[str], operator.add]           # append-merge across nodes
    agent_trace: Annotated[list[str], operator.add]      # append-merge across nodes
    run_id: str
