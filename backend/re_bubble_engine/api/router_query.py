from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from agents.graph import run_agent_graph

router = APIRouter(tags=["query"])


class QueryRequest(BaseModel):
    question: str
    region: Optional[str] = "national"


@router.post("/query")
async def query_market(request: QueryRequest):
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="question cannot be empty")

    result = await run_agent_graph(
        {
            "trigger": "query",
            "query_request": request.question,
            "region": request.region,
        }
    )
    return {
        "answer": result.get("query_response"),
        "run_id": result.get("run_id"),
        "errors": result.get("errors", []),
    }
