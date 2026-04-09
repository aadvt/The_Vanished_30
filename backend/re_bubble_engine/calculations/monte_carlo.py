import numpy as np
from typing import Dict, Any, List
from pydantic import BaseModel

class MonteCarloOutput(BaseModel):
    p5: float
    p10: float
    p25: float
    p50: float
    p75: float
    p90: float
    p95: float
    prob_below_current: float
    var_95: float
    n_simulations: int
    propagation_trace: List[str] = []

class MonteCarloEngine:
    def run_simulation(
        self, 
        base_noi: float, 
        base_value: float, 
        shock_scenario: Dict[str, Any], 
        n_simulations: int = 1000
    ) -> MonteCarloOutput:
        # Shock factors from scenario
        rate_change_bps = shock_scenario.get("rate_change_bps", 0)
        inflation_change_pct = shock_scenario.get("inflation_change_pct", 0) or 0
        gdp_shock_pct = shock_scenario.get("gdp_shock_pct", 0) or 0

        trace = []
        if rate_change_bps != 0:
            trace.append(f"Repo Rate shock of {rate_change_bps}bps detected. Adjusting Cost of Capital.")
        if inflation_change_pct != 0:
            trace.append(f"Inflation indexing at {inflation_change_pct}%. Triggering Opex pressure.")
        if gdp_shock_pct != 0:
            trace.append(f"GDP Demand shock ({gdp_shock_pct}%). Calibrating occupancy expectations.")

        # --- Cap Rate Shock ---
        current_yield = base_noi / base_value if base_value > 0 else 0.05
        implied_base_cap_rate = max(0.02, min(0.20, current_yield)) 
        
        # Intermediate trace steps for logic propagation
        trace.append(f"Initial Asset Yield is {current_yield*100:.1f}%. Starting baseline DCF simulation.")

        sim_values = []
        for _ in range(n_simulations):
            inflation_cap_premium = (inflation_change_pct / 100) * 0.3
            cap_rate = implied_base_cap_rate + (rate_change_bps / 10000) + inflation_cap_premium + np.random.normal(0, 0.005)
            cap_rate = max(0.02, cap_rate)

            noi_inflation_drag = 1.0 - (inflation_change_pct / 100) * 0.15
            noi_gdp_boost = 1.0 + (gdp_shock_pct / 100) * 0.2
            noi = base_noi * noi_inflation_drag * noi_gdp_boost * (1 + np.random.normal(0, 0.03))
            noi = max(noi, base_noi * 0.1)

            sim_value = noi / cap_rate
            sim_values.append(sim_value)
            
        sim_values = np.array(sim_values)
        
        percentiles = np.percentile(sim_values, [5, 10, 25, 50, 75, 90, 95])
        prob_below = (sim_values < base_value).mean()
        var_95 = base_value - percentiles[0]
        
        # Add result-driven trace steps
        if prob_below > 0.4:
            trace.append(f"WARNING: Asset impairment probability exceeds 40%. Volatility detected.")
        else:
            trace.append(f"Asset resilience confirmed across {n_simulations} stochastic paths.")
            
        trace.append(f"Finalizing {n_simulations} stochastic paths. Transmitting result to HUD...")

        return MonteCarloOutput(
            p5=percentiles[0],
            p10=percentiles[1],
            p25=percentiles[2],
            p50=percentiles[3],
            p75=percentiles[4],
            p90=percentiles[5],
            p95=percentiles[6],
            prob_below_current=float(prob_below),
            var_95=float(var_95),
            n_simulations=n_simulations,
            propagation_trace=trace
        )
