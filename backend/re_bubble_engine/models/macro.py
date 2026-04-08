from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Dict, Any

class MacroSnapshot(BaseModel):
    # World Bank / Macro
    gdp_growth: Optional[float] = None
    cpi_yoy: Optional[float] = None
    unemployment_rate: Optional[float] = None
    home_loan_rate: Optional[float] = None
    gnpa_ratio: Optional[float] = None
    m3_money_supply: Optional[float] = None
    wpi_inflation: Optional[float] = None
    
    # RBI
    repo_rate: Optional[float] = None
    gsec_10y_yield: Optional[float] = None
    gsec_2y_yield: Optional[float] = None
    housing_credit: Optional[float] = None
    consumer_confidence: Optional[float] = None
    
    # NHB RESIDEX
    nhb_residex_composite: Optional[float] = None
    nhb_residex_mumbai: Optional[float] = None
    nhb_residex_delhi: Optional[float] = None
    nhb_residex_bangalore: Optional[float] = None
    nhb_residex_chennai: Optional[float] = None
    
    # Computed
    median_home_price_inr: Optional[float] = None
    median_household_income_inr: Optional[float] = None
    
    snapshot_at: datetime = Field(default_factory=datetime.utcnow)

class RatioSummary(BaseModel):
    price_income_ratio: Optional[float] = None
    price_rent_ratio: Optional[float] = None
    affordability_pct: Optional[float] = None
    residex_gain_pct: Optional[float] = None
    bubble_signals_count: int = 0
    flagged_signals: List[str] = []

class DCFResult(BaseModel):
    estimated_value: Optional[float] = None
    discount_rate: Optional[float] = None
    terminal_growth_rate: Optional[float] = None

class MonteCarloOutput(BaseModel):
    mean_value: Optional[float] = None
    confidence_interval_95: Optional[List[float]] = None
    prob_loss: Optional[float] = None

class ValuationResult(BaseModel):
    region: str = "national"
    current_value: Optional[float] = None
    intrinsic_value: Optional[float] = None
    overvaluation_pct: Optional[float] = None

class BubbleRiskScore(BaseModel):
    overall_score: int
    risk_level: str
    key_drivers: List[str]

class ScenarioResult(BaseModel):
    name: str
    impact_magnitude: Optional[float] = None
    probability: Optional[float] = None

class QueryResponse(BaseModel):
    answer: str
    data: Optional[Dict[str, Any]] = None
    sources: List[str] = []
