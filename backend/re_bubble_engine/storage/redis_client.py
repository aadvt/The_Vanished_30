import json
from typing import Any, Optional
from redis import asyncio as aioredis
from config import settings
from models.macro import MacroSnapshot

def get_redis() -> aioredis.Redis:
    url = settings.REDIS_URL
    if "upstash.io" in url and url.startswith("redis://"):
        url = url.replace("redis://", "rediss://")
        
    return aioredis.from_url(
        url, 
        encoding="utf-8", 
        decode_responses=True
    )

async def cache_set(key: str, value: Any, ttl_seconds: int = 3600):
    redis = get_redis()
    await redis.set(key, json.dumps(value), ex=ttl_seconds)

async def cache_get(key: str) -> Optional[Any]:
    redis = get_redis()
    data = await redis.get(key)
    return json.loads(data) if data else None

async def build_macro_snapshot(region: str = "national") -> MacroSnapshot:
    redis = get_redis()
    
    # Base mapping for national indicators
    mapping = {
        "wb:GDP_GROWTH": "gdp_growth",
        "wb:CPI_YOY": "cpi_yoy",
        "wb:UNEMPLOYMENT": "unemployment_rate",
        "wb:HOME_LOAN_RATE": "home_loan_rate",
        "wb:GNPA": "gnpa_ratio",
        "wb:M3_GROWTH": "m3_money_supply",
        "wb:WPI_YOY": "wpi_inflation",
        "rbi:REPO_RATE": "repo_rate",
        "rbi:GSEC_10Y": "gsec_10y_yield",
        "rbi:GSEC_2Y": "gsec_2y_yield",
        "rbi:HOUSING_CREDIT": "housing_credit",
        "rbi:CONSUMER_CONFIDENCE": "consumer_confidence",
        "nhb:RESIDEX_COMPOSITE": "nhb_residex_composite",
        "india:MEDIAN_HOME_PRICE": "median_home_price_inr",
        "india:MEDIAN_HH_INCOME": "median_household_income_inr"
    }

    # Add regional mapping overrides
    region_upper = region.upper()
    city_residex_key = f"nhb:RESIDEX_{region_upper}"
    
    snapshot_data = {}
    for redis_key, field_name in mapping.items():
        val = await redis.get(redis_key)
        if val is not None:
            try:
                snapshot_data[field_name] = float(val)
            except (ValueError, TypeError):
                snapshot_data[field_name] = None
    
    # Specific city index override
    city_val = await redis.get(city_residex_key)
    if city_val:
        snapshot_data["nhb_residex_composite"] = float(city_val)

    # Store city-specific Residex keys for the frontend
    # This loop ensures we catch all 8 cities for the sidebar/HUD
    for city in ["MUMBAI", "DELHI", "BANGALORE", "CHENNAI", "HYDERABAD", "KOLKATA", "PUNE", "AHMEDABAD"]:
        idx_val = await redis.get(f"nhb:RESIDEX_{city}")
        if idx_val:
            snapshot_data[f"nhb_residex_{city.lower()}"] = float(idx_val)
                
    return MacroSnapshot(**snapshot_data)

async def publish_event(channel: str, event_dict: dict):
    redis = get_redis()
    await redis.publish(channel, json.dumps(event_dict))
