import httpx
from typing import Dict
from bs4 import BeautifulSoup
from config import settings
from utils.logger import log
from storage.redis_client import cache_set
from storage.db import AsyncSessionLocal
from storage.models.macro_indicators import MacroIndicator

class NHBClient:
    CITY_MAP = {
        "nhb:RESIDEX_COMPOSITE":  "Composite",
        "nhb:RESIDEX_MUMBAI":     "Mumbai",
        "nhb:RESIDEX_DELHI":      "Delhi",
        "nhb:RESIDEX_BANGALORE":  "Bengaluru", # Scrape might use Bengaluru
        "nhb:RESIDEX_CHENNAI":    "Chennai",
    }

    FALLBACK_VALUES = {
        "nhb:RESIDEX_COMPOSITE":  136.0,
        "nhb:RESIDEX_MUMBAI":     154.2,
        "nhb:RESIDEX_DELHI":      145.8,
        "nhb:RESIDEX_BANGALORE":  171.3,
        "nhb:RESIDEX_CHENNAI":    139.4,
    }

    def __init__(self):
        self.url = settings.NHB_RESIDEX_URL
        self.headers = {"User-Agent": "Mozilla/5.0 (compatible; re-bubble-engine/1.0)"}

    async def scrape_residex(self) -> Dict[str, float]:
        results = {}
        source = "fallback"
        
        try:
            async with httpx.AsyncClient(timeout=30, verify=False) as client:
                response = await client.get(self.url, headers=self.headers)
                response.raise_for_status()
            
            soup = BeautifulSoup(response.text, "lxml")
            text_content = soup.get_text()
            
            # Very simple scraping logic - search for city names and nearby numbers
            # In a real scenario, this would need specific selectors
            for redis_key, city_name in self.CITY_MAP.items():
                # Look for city name followed by a 3-digit number with decimal
                # Example: "Mumbai 154.2"
                match_pattern = fr"{city_name}.*?(\d{{3}}\.\d{{1,2}})"
                import re
                match = re.search(match_pattern, text_content, re.IGNORECASE)
                if match:
                    results[redis_key] = float(match.group(1))
                    source = "live"
        except Exception as e:
            log.warning("nhb_scrape_error", error=str(e))

        # Fill in fallbacks for missing cities
        for redis_key, fallback_val in self.FALLBACK_VALUES.items():
            if redis_key not in results:
                results[redis_key] = fallback_val
        
        log.info("nhb_scraped", source=source, values=results)
        return results

    async def fetch_all(self) -> Dict[str, float]:
        results = await self.scrape_residex()
        
        # Values are daily if live, hourly if fallback (per spec, but we'll use 86400/3600)
        # We can't easily know if ALL were live, so if source was fallback, use 3600
        # Actually simplest to just use 86400 if results has live data
        
        async with AsyncSessionLocal() as session:
            for redis_key, value in results.items():
                is_fallback = value == self.FALLBACK_VALUES.get(redis_key)
                ttl = 3600 if is_fallback else 86400
                
                await cache_set(redis_key, value, ttl_seconds=ttl)
                
                new_indicator = MacroIndicator(
                    series_id=redis_key,
                    value=value,
                    source="NHB",
                    unit="Index"
                )
                session.add(new_indicator)
            
            await session.commit()
            
        return results
