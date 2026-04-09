import { ZoneData } from '@/store/useStore'

export const DEMO_ZONES: ZoneData[] = [
  {
    id: 'mumbai-bkc',
    name: 'BKC Financial District',
    region: 'Mumbai',
    risk_score: 68,
    yield_pct: 4.2,
    appreciation_pct: 8.5,
    occupancy_pct: 92,
    recommendation: 'HOLD',
    details: 'Institutional demand remains high, but entry yields are compressed.',
    narrative: 'The Bandra Kurla Complex is currently seeing extreme valuation pressure. While institutional occupancy is near 92%, the P/I ratio is at a 10-year high. Recommend holding existing positions but deferring new opportunistic buys.',
    boundary: {
      type: 'Polygon',
      coordinates: [[
        [72.8610, 19.0680],
        [72.8720, 19.0680],
        [72.8720, 19.0600],
        [72.8610, 19.0600],
        [72.8610, 19.0680]
      ]]
    }
  },
  {
    id: 'bangalore-whitefield',
    name: 'Whitefield IT Corridor',
    region: 'Bangalore',
    risk_score: 74,
    yield_pct: 5.8,
    appreciation_pct: 12.0,
    occupancy_pct: 88,
    recommendation: 'SELL',
    details: 'Overlapping supply pipeline and infrastructural stress are driving risk.',
    narrative: 'Whitefield is showing classic late-cycle symptoms. Capital values have outpaced rental growth by 35% in the last 24 months. With 12M sqft of new supply hitting the market, a price correction is likely in the next 18 months.',
    boundary: {
      type: 'Polygon',
      coordinates: [[
        [77.7400, 12.9800],
        [77.7600, 12.9800],
        [77.7600, 12.9600],
        [77.7400, 12.9600],
        [77.7400, 12.9800]
      ]]
    }
  },
  {
    id: 'ahmedabad-gift',
    name: 'GIFT City Smart Zone',
    region: 'Ahmedabad',
    risk_score: 18,
    yield_pct: 7.2,
    appreciation_pct: 15.4,
    occupancy_pct: 76,
    recommendation: 'BUY',
    details: 'Early stage high-growth zone with SEZ tax benefits.',
    narrative: 'GIFT City represents the most stable and high-potential zone in the engine\'s current index. Tax incentives and regulatory easing are attracting global capital. Valuations are still 40% below historical peak potential. Strong Buy for long-term yields.',
    boundary: {
      type: 'Polygon',
      coordinates: [[
        [72.6800, 23.1650],
        [72.6950, 23.1650],
        [72.6950, 23.1550],
        [72.6800, 23.1550],
        [72.6800, 23.1650]
      ]]
    }
  }
]

export const findZoneByCoordinates = (lng: number, lat: number, region: string): ZoneData | null => {
  // Simple check if coordinate is near a demo zone center
  const matched = DEMO_ZONES.find(zone => {
    if (zone.region.toLowerCase() !== region.toLowerCase()) return false
    const coords = zone.boundary.coordinates[0]
    const minLng = Math.min(...coords.map((c: any) => c[0]))
    const maxLng = Math.max(...coords.map((c: any) => c[0]))
    const minLat = Math.min(...coords.map((c: any) => c[1]))
    const maxLat = Math.max(...coords.map((c: any) => c[1]))
    
    // Add a small buffer for clicking
    const buffer = 0.005
    return lng >= minLng - buffer && lng <= maxLng + buffer && 
           lat >= minLat - buffer && lat <= maxLat + buffer
  })
  
  return matched || null
}
