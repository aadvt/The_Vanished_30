from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field, ConfigDict


class BaseWSMessage(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    type: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class MacroUpdateMessage(BaseWSMessage):
    model_config = ConfigDict(populate_by_name=True)

    type: str = "macro_update"
    payload: dict


class ValuationUpdateMessage(BaseWSMessage):
    model_config = ConfigDict(populate_by_name=True)

    type: str = "valuation_update"
    payload: dict


class RiskUpdateMessage(BaseWSMessage):
    model_config = ConfigDict(populate_by_name=True)

    type: str = "risk_update"
    payload: dict


class ScenarioUpdateMessage(BaseWSMessage):
    model_config = ConfigDict(populate_by_name=True)

    type: str = "scenario_update"
    payload: list


class QueryResponseMessage(BaseWSMessage):
    model_config = ConfigDict(populate_by_name=True)

    type: str = "query_response"
    payload: dict


class AlertMessage(BaseWSMessage):
    model_config = ConfigDict(populate_by_name=True)

    type: str = "bubble_alert"
    payload: dict
    severity: str


class HeartbeatMessage(BaseWSMessage):
    model_config = ConfigDict(populate_by_name=True)

    type: str = "heartbeat"
    payload: dict = {}
