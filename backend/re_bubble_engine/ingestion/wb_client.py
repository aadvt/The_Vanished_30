import httpx
import asyncio
from typing import Optional, Dict, Any
from config import settings
from utils.logger import log
from utils.rate_limiter import AsyncTokenBucket
from storage.redis_client import cache_get, cache_set
from storage.db import AsyncSessionLocal
from storage.models.macro_indicators import MacroIndicator
from sqlalchemy import select, update
import json

class WorldBankClient:
    SERIES_MAP = {
        "wb:GDP_GROWTH":   {"indicator": "NY.GDP.MKTP.KD.ZG", "field": "gdp_growth"},
        "wb:CPI_YOY":      {"indicator": "FP.CPI.TOTL.ZG",    "field": "cpi_yoy"},
        "wb:UNEMPLOYMENT": {"indicator": "SL.UEM.TOTL.ZS",    "field": "unemployment_rate"},
        "wb:HOME_LOAN_RATE":{"indicator": "FR.INR.LEND",      "field": "home_loan_rate_avg"},
        "wb:GNPA":         {"indicator": "FS.AST.NPLS.ZS",    "field": "gnpa_ratio"},
        "wb:M3_GROWTH":    {"indicator": "FM.LBL.BMNY.GD.ZS", "field": "m3_money_supply"},
        "wb:WPI_YOY":      {"indicator": "FP.WPI.TOTL",       "field": "wpi_inflation"},
    }

    def __init__(self):
        self.base_url = settings.WORLD_BANK_BASE_URL
        self.rate_limiter = AsyncTokenBucket(max_calls=10, period_seconds=60)
        self.client = httpx.AsyncClient(base_url=self.base_url, timeout=30)

    async def fetch_indicator(self, series_id: str) -> Optional[float]:
        config = self.SERIES_MAP.get(series_id)
        if not config:
            return None
        
        indicator_id = config["indicator"]
        cache_key = f"wb:{indicator_id}"
        
        cached = await cache_get(cache_key)
        if cached is not None:
            return float(cached)

        await self.rate_limiter.acquire()
        try:
            # mrv=5: most recent 5 values
            response = await self.client.get(f"/country/IN/indicator/{indicator_id}?format=json&mrv=5&per_page=5")
            response.raise_for_status()
            data = response.json()
            
            if not isinstance(data, list) or len(data) < 2:
                return None
            
            data_array = data[1]
            if not data_array:
                return None
            
            # data_array is sorted newest first. Filter out items where value is None.
            for item in data_array:
                val = item.get("value")
                if val is not None:
                    value = float(val)
                    await cache_set(cache_key, value, ttl_seconds=86400)
                    log.info("wb_fetched", indicator=indicator_id, value=value)
                    return value
        except Exception as e:
            log.error("wb_fetch_error", indicator=indicator_id, error=str(e))
            return None
        
        return None

    async def fetch_all(self) -> Dict[str, float]:
        results = {}
        tasks = {series_id: self.fetch_indicator(series_id) for series_id in self.SERIES_MAP}
        
        # Run concurrently
        fetched = await asyncio.gather(*tasks.values())
        
        series_results = dict(zip(tasks.keys(), fetched))
        
        async with AsyncSessionLocal() as session:
            for series_id, value in series_results.items():
                if value is not None:
                    results[series_id] = value
                    # Upsert into Redis with standardized key
                    await cache_set(series_id, value, ttl_seconds=86400)
                    
                    # Upsert into macro_indicators table
                    # Using a simple check and insert for now, ideally an upsert logic
                    new_indicator = MacroIndicator(
                        series_id=series_id,
                        value=value,
                        source="WorldBank",
                        unit="%" # World Bank indicators in our map are generally % or index
                    )
                    session.add(new_indicator)
            
            await session.commit()
            
        return results
