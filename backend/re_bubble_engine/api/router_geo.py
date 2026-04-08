from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sqlalchemy import select, func
from storage.db import AsyncSessionLocal
from storage.models.bubble_flags import BubbleFlag
from storage.redis_client import cache_get, cache_set
import json

router = APIRouter(tags=["geo"])

CITY_BOUNDARIES = {
  "mumbai": {
    "type": "Polygon",
    "coordinates": [[[72.775, 18.890],[72.775, 19.270],[73.050, 19.270],[73.050, 18.890],[72.775, 18.890]]]
  },
  "delhi": {
    "type": "Polygon",
    "coordinates": [[[76.840, 28.400],[76.840, 28.880],[77.350, 28.880],[77.350, 28.400],[76.840, 28.400]]]
  },
  "bangalore": {
    "type": "Polygon",
    "coordinates": [[[77.460, 12.830],[77.460, 13.140],[77.780, 13.140],[77.780, 12.830],[77.460, 12.830]]]
  },
  "chennai": {
    "type": "Polygon",
    "coordinates": [[[80.170, 12.900],[80.170, 13.230],[80.310, 13.230],[80.310, 12.900],[80.170, 12.900]]]
  }
}

def score_to_color(score: int) -> tuple[str, float]:
  if score >= 81: return "#E24B4A", 0.75
  if score >= 61: return "#EF9F27", 0.65
  if score >= 31: return "#378ADD", 0.45
  return "#1D9E75", 0.35

@router.get("/geo/bubble-map")
async def get_bubble_map():
  cached = await cache_get("geo:bubble_map")
  if cached: 
      return JSONResponse(content=cached)
  
  async with AsyncSessionLocal() as session:
    subq = (
      select(BubbleFlag.region, func.max(BubbleFlag.created_at).label("max_at"))
      .where(BubbleFlag.is_active == True)
      .group_by(BubbleFlag.region)
      .subquery()
    )
    result = await session.execute(
      select(BubbleFlag).join(subq,
        (BubbleFlag.region == subq.c.region) & (BubbleFlag.created_at == subq.c.max_at)
      )
    )
    flags = result.scalars().all()
  
  features = []
  for flag in flags:
    key = flag.region.lower().replace(" ", "_").replace("-", "_")
    boundary = CITY_BOUNDARIES.get(key)
    if not boundary:
      continue
    color, opacity = score_to_color(flag.overall_score)
    features.append({
      "type": "Feature",
      "geometry": boundary,
      "properties": {
        "city": flag.region,
        "region_id": key,
        "overall_score": flag.overall_score,
        "price_income_ratio": flag.price_income_ratio,
        "price_rent_ratio": flag.price_rent_ratio,
        "affordability_pct": flag.affordability_pct,
        "cap_rate_spread": flag.cap_rate_spread,
        "narrative": flag.narrative,
        "last_updated": flag.created_at.isoformat() if flag.created_at else None,
        "fill_color": color,
        "fill_opacity": opacity,
      }
    })
  
  geojson = {"type": "FeatureCollection", "features": features}
  await cache_set("geo:bubble_map", geojson, ttl_seconds=300)
  return JSONResponse(content=geojson)

@router.get("/geo/bubble-map/refresh")
async def refresh_bubble_map():
  from storage.redis_client import get_redis
  r = get_redis()
  await r.delete("geo:bubble_map")
  return await get_bubble_map()
