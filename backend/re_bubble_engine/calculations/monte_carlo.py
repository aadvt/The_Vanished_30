import numpy as np
from typing import Dict, Any, List
from pydantic import BaseModel

class MonteCarloOutput(BaseModel):
    p10: float
    p25: float
    p50: float
    p75: float
    p90: float
    prob_below_current: float
    var_95: float
    n_simulations: int

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
        
        # Stochastic parameters
        # 1. Cap Rate Shock: derived from rate change with some noise
        # 2. NOI Shock: inflation volatility
        # 3. Value Shock: GDP volatility
        
        sim_values = []
        for _ in range(n_simulations):
            # Stochastic cap rate: base (assume 8%) + shock + noise
            # rate_change_bps of 100 = 1% increase
            cap_rate = 0.08 + (rate_change_bps / 10000) + np.random.normal(0, 0.005)
            cap_rate = max(0.04, cap_rate) # Floor at 4%
            
            # Stochastic NOI: base + noise
            noi = base_noi * (1 + np.random.normal(0, 0.03))
            
            sim_value = noi / cap_rate
            sim_values.append(sim_value)
            
        sim_values = np.array(sim_values)
        
        percentiles = np.percentile(sim_values, [10, 25, 50, 75, 90])
        prob_below = (sim_values < base_value).mean()
        var_95 = base_value - np.percentile(sim_values, 5)
        
        return MonteCarloOutput(
            p10=percentiles[0],
            p25=percentiles[1],
            p50=percentiles[2],
            p75=percentiles[3],
            p90=percentiles[4],
            prob_below_current=float(prob_below),
            var_95=float(var_95),
            n_simulations=n_simulations
        )
