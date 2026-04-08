import httpx
import asyncio
import re
from typing import Optional, Dict, Any
from bs4 import BeautifulSoup
from config import settings
from utils.logger import log
from utils.rate_limiter import AsyncTokenBucket
from storage.redis_client import cache_get, cache_set
from storage.db import AsyncSessionLocal
from storage.models.macro_indicators import MacroIndicator

class RBIClient:
    DBIE_SERIES_MAP = {
        "rbi:REPO_RATE":       {"dbie_id": "7",    "field": "repo_rate"},
        "rbi:GSEC_10Y":        {"dbie_id": "66",   "field": "gsec_10y_yield"},
        "rbi:GSEC_2Y":         {"dbie_id": "64",   "field": "gsec_2y_yield"},
        "rbi:HOUSING_CREDIT":  {"dbie_id": "5013", "field": "housing_credit_growth"},
        "rbi:M3_GROWTH":       {"dbie_id": "156",  "field": "m3_money_supply"},
        "rbi:CONSUMER_CONFIDENCE": {"dbie_id": "1569", "field": "rbi_consumer_confidence"},
    }

    def __init__(self):
        self.base_url = settings.RBI_BASE_URL
        self.rate_limiter = AsyncTokenBucket(max_calls=5, period_seconds=60)
        self.client = httpx.AsyncClient(timeout=30, verify=False, follow_redirects=True)
        self.headers = {"User-Agent": "Mozilla/5.0 (compatible; re-bubble-engine/1.0)"}

    async def fetch_dbie_series(self, series_id: str) -> Optional[float]:
        config = self.DBIE_SERIES_MAP.get(series_id)
        if not config:
            return None
        
        dbie_id = config["dbie_id"]
        cache_key = f"rbi:{dbie_id}"
        
        cached = await cache_get(cache_key)
        if cached is not None:
            return float(cached)

        await self.rate_limiter.acquire()
        try:
            url = f"{self.base_url}?site=api&type=S&id={dbie_id}&format=json"
            response = await self.client.get(url)
            response.raise_for_status()
            data = response.json()
            
            series_data = data.get("data", [])
            if not series_data:
                log.warning("rbi_dbie_empty", series_id=series_id, dbie_id=dbie_id)
                return None
            
            # Assuming [date, value] pairs, sort by date descending
            # RBI dates can be tricky, but often newest is last or we sort by string
            # For simplicity, let's take the last one or sort if date is predictable
            try:
                # Filter out None/"NaN"
                valid_data = [d for d in series_data if d[1] not in (None, "NaN", "null")]
                if not valid_data:
                    return None
                
                # Take latest
                latest_value = float(valid_data[-1][1])
                await cache_set(cache_key, latest_value, ttl_seconds=3600)
                return latest_value
            except (ValueError, IndexError, TypeError) as e:
                log.warning("rbi_parse_error", series_id=series_id, error=str(e))
                return None
        except Exception as e:
            log.warning("rbi_http_error", series_id=series_id, error=str(e))
            return None

    async def fetch_home_loan_rate_from_rbi(self) -> Optional[float]:
        try:
            url = "https://www.rbi.org.in/home.aspx"
            response = await self.client.get(url, headers=self.headers)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, "lxml")
            
            # Common pattern for RBI home page policy rates
            # Usually in a table with class 'table-responsive' or similar or just text
            text_content = soup.get_text()
            
            # Try to find Repo Rate first as a proxy or if mentioned explicitly
            repo_match = re.search(r"Policy Repo Rate\s*:\s*(\d+\.\d+)", text_content)
            if repo_match:
                return float(repo_match.group(1))
            
            # Specific search for MCLR or Home Loan if available
            mclr_match = re.search(r"MCLR\s*\(.*?\)\s*:\s*(\d+\.\d+)", text_content)
            if mclr_match:
                return float(mclr_match.group(1))
                
            return None
        except Exception as e:
            log.warning("rbi_scrape_error", error=str(e))
            return None

    async def fetch_all(self) -> Dict[str, float]:
        results = {}
        dbie_tasks = {sid: self.fetch_dbie_series(sid) for sid in self.DBIE_SERIES_MAP}
        
        # Also fetch home loan rate
        loan_task = self.fetch_home_loan_rate_from_rbi()
        
        all_results = await asyncio.gather(*dbie_tasks.values(), loan_task)
        
        dbie_results = dict(zip(dbie_tasks.keys(), all_results[:-1]))
        home_loan_rate = all_results[-1]
        
        async with AsyncSessionLocal() as session:
            # Handle DBIE series
            for series_id, value in dbie_results.items():
                if value is not None:
                    results[series_id] = value
                    await cache_set(series_id, value, ttl_seconds=3600)
                    new_indicator = MacroIndicator(
                        series_id=series_id,
                        value=value,
                        source="RBI",
                        unit="%"
                    )
                    session.add(new_indicator)
            
            # Handle home loan rate override or supplement
            if home_loan_rate is not None:
                series_id = "rbi:HOME_LOAN_RATE"
                results[series_id] = home_loan_rate
                await cache_set(series_id, home_loan_rate, ttl_seconds=3600)
                session.add(MacroIndicator(
                    series_id=series_id,
                    value=home_loan_rate,
                    source="RBI_Scrape",
                    unit="%"
                ))
            
            await session.commit()
            
        return results
