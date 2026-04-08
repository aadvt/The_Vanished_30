import asyncio
from typing import Dict, Any
from ingestion.wb_client import WorldBankClient
from ingestion.rbi_client import RBIClient
from ingestion.nhb_client import NHBClient
from storage.redis_client import cache_set, cache_get, build_macro_snapshot
from storage.db import AsyncSessionLocal
from storage.models.macro_indicators import MacroIndicator
from storage.models.ingestion_log import IngestionLog
from utils.logger import log
from sqlalchemy import select, desc

class IngestCoordinator:
    async def run_macro_refresh(self) -> Dict[str, Any]:
        combined_values = {}
        
        # 1. Fetch from World Bank
        try:
            wb_result = await WorldBankClient().fetch_all()
            combined_values.update(wb_result)
            await self._log_ingestion("WorldBank", "success", len(wb_result))
        except Exception as e:
            log.error("ingest_fail", source="WorldBank", error=str(e))
            await self._log_ingestion("WorldBank", "error", 0)
            wb_result = {}

        # 2. Fetch from RBI
        try:
            rbi_result = await RBIClient().fetch_all()
            combined_values.update(rbi_result)
            await self._log_ingestion("RBI", "success", len(rbi_result))
        except Exception as e:
            log.error("ingest_fail", source="RBI", error=str(e))
            await self._log_ingestion("RBI", "error", 0)
            rbi_result = {}

        # 3. Fetch from NHB
        try:
            nhb_result = await NHBClient().fetch_all()
            combined_values.update(nhb_result)
            await self._log_ingestion("NHB", "success", len(nhb_result))
        except Exception as e:
            log.error("ingest_fail", source="NHB", error=str(e))
            await self._log_ingestion("NHB", "error", 0)
            nhb_result = {}

        if not combined_values:
            return {"status": "error", "message": "all sources failed"}

        # 4. Computed India-specific keys
        # median_home_price_inr: RESIDEX_COMPOSITE * 0.48 (calibration: 136 ≈ 65 lakh)
        residex_comp = combined_values.get("nhb:RESIDEX_COMPOSITE")
        if residex_comp:
            median_price = round(residex_comp * 0.48, 2)
            combined_values["india:MEDIAN_HOME_PRICE"] = median_price
            await cache_set("india:MEDIAN_HOME_PRICE", median_price, ttl_seconds=86400)
            await self._upsert_indicator("india:MEDIAN_HOME_PRICE", median_price, "computed", "Lakh INR")

        # median_household_income_inr: derive from GDP or use last DB
        gdp_growth = combined_values.get("wb:GDP_GROWTH")
        async with AsyncSessionLocal() as session:
            stmt = select(MacroIndicator).where(MacroIndicator.series_id == "india:MEDIAN_HH_INCOME").order_by(desc(MacroIndicator.recorded_at)).limit(1)
            result = await session.execute(stmt)
            last_income = result.scalars().first()
            
            if last_income:
                base_income = last_income.value
                # If GDP growth is available, grow the income slightly as a proxy
                if gdp_growth:
                    new_income = round(base_income * (1 + (gdp_growth / 100)), 2)
                else:
                    new_income = base_income
                
                combined_values["india:MEDIAN_HH_INCOME"] = new_income
                await cache_set("india:MEDIAN_HH_INCOME", new_income, ttl_seconds=86400)
                await self._upsert_indicator("india:MEDIAN_HH_INCOME", new_income, "computed", "Lakh INR")

        # 5. Build snapshot and cache
        snapshot = await build_macro_snapshot()
        await cache_set("macro:snapshot", snapshot.model_dump_json(), ttl_seconds=3600)

        log.info(
            "macro_refresh_complete",
            wb_records=len(wb_result),
            rbi_records=len(rbi_result),
            nhb_records=len(nhb_result)
        )

        return {
            "status": "success",
            "total_records": len(combined_values),
            "wb": len(wb_result),
            "rbi": len(rbi_result),
            "nhb": len(nhb_result)
        }

    async def _log_ingestion(self, source: str, status: str, count: int):
        async with AsyncSessionLocal() as session:
            log_entry = IngestionLog(
                source=source,
                status=status,
                records_ingested=count
            )
            session.add(log_entry)
            await session.commit()

    async def _upsert_indicator(self, series_id: str, value: float, source: str, unit: str):
        async with AsyncSessionLocal() as session:
            new_indicator = MacroIndicator(
                series_id=series_id,
                value=value,
                source=source,
                unit=unit
            )
            session.add(new_indicator)
            await session.commit()

async def seed_redis_from_db() -> None:
    async with AsyncSessionLocal() as session:
        # Get distinct series_ids first
        stmt = select(MacroIndicator.series_id).distinct()
        result = await session.execute(stmt)
        series_ids = result.scalars().all()
        
        count = 0
        for sid in series_ids:
            # Get latest for each
            latest_stmt = select(MacroIndicator).where(MacroIndicator.series_id == sid).order_by(desc(MacroIndicator.recorded_at)).limit(1)
            latest_result = await session.execute(latest_stmt)
            latest = latest_result.scalars().first()
            if latest:
                await cache_set(sid, latest.value, ttl_seconds=86400)
                count += 1
        
        # Also build and cache snapshot
        snapshot = await build_macro_snapshot()
        await cache_set("macro:snapshot", snapshot.model_dump_json(), ttl_seconds=3600)
        
        log.info("redis_seeded_from_db", keys=count)
