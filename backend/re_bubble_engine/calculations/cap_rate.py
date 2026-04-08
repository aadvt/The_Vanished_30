from typing import Dict, Any

class CapRateCalculator:
    def from_noi(self, noi: float, value: float) -> float:
        if value <= 0: return 0.0
        return noi / value

    def implied_value(self, noi: float, cap_rate: float) -> float:
        if cap_rate <= 0: return 0.0
        return noi / cap_rate

    def spread_analysis(self, cap_rate: float, gsec_yield: float) -> Dict[str, Any]:
        # gsec_yield expected as percentage (e.g. 6.83)
        cap_rate_bps = cap_rate * 10000
        gsec_bps = gsec_yield * 100
        spread_bps = cap_rate_bps - gsec_bps
        
        # Indian market: cap rates compress to 100-150bps over G-Sec in bubble
        # True if spread < 100bps
        bubble_signal = spread_bps < 100
        
        return {
            "spread_bps": spread_bps,
            "bubble_signal": bubble_signal,
            "gsec_yield": gsec_yield,
            "cap_rate": cap_rate
        }
