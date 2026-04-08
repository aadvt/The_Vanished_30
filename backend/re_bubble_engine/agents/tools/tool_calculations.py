from calculations.dcf import DCFEngine
from calculations.ratios import RatioCalculator
from calculations.monte_carlo import MonteCarloEngine
from storage.redis_client import build_macro_snapshot

def run_dcf(noi, growth_rate, discount_rate, terminal_cap_rate, hold_years):
    engine = DCFEngine(noi, growth_rate, discount_rate, terminal_cap_rate, hold_years)
    return engine.run()

async def compute_ratios_from_snapshot():
    snapshot = await build_macro_snapshot()
    calc = RatioCalculator()
    return calc.compute_all(snapshot)

def run_monte_carlo_scenario(base_noi, base_growth, base_discount, current_value, shock_params, num_simulations=1000):
    engine = MonteCarloEngine()
    return engine.run_simulation(base_noi, current_value, shock_params, num_simulations)
