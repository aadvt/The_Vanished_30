import numpy as np
from pydantic import BaseModel
from typing import List, Dict

class DCFResult(BaseModel):
    total_value: float
    pv_cashflows: float
    pv_terminal_value: float
    irr: float
    equity_multiple: float
    yearly_cashflows: List[float]

class DCFEngine:
    def calculate(
        self, 
        noi: float, 
        growth_rate: float, 
        discount_rate: float, 
        terminal_cap_rate: float, 
        hold_years: int = 10
    ) -> DCFResult:
        cashflows = []
        current_noi = noi
        
        # Yearly projections
        for _ in range(hold_years):
            cashflows.append(current_noi)
            current_noi *= (1 + growth_rate)
            
        # Terminal Value
        terminal_value = current_noi / terminal_cap_rate
        
        # Present Values
        pv_cashflows = sum([cf / (1 + discount_rate)**(i+1) for i, cf in enumerate(cashflows)])
        pv_terminal_value = terminal_value / (1 + discount_rate)**hold_years
        total_value = pv_cashflows + pv_terminal_value
        
        # IRR Calculation
        # Initial outlay is negative total_value, then cashflows, then terminal value
        irr_flows = [-total_value] + cashflows[:-1] + [cashflows[-1] + terminal_value]
        try:
            # np.irr is deprecated, use np.roots or financial library if available
            # np.irr was replaced by numpy_financial.irr
            # We'll use a simplified Newton-Raphson if needed, but numpy.irr is often still there in some versions
            # Or use np.npv and solve for 0
            # For simplicity, let's use a basic irr solver if numpy_financial isn't here
            irr = self._calculate_irr(irr_flows)
        except Exception:
            irr = 0.0
            
        equity_multiple = (sum(cashflows) + terminal_value) / total_value
        
        return DCFResult(
            total_value=total_value,
            pv_cashflows=pv_cashflows,
            pv_terminal_value=pv_terminal_value,
            irr=irr,
            equity_multiple=equity_multiple,
            yearly_cashflows=cashflows
        )

    def _calculate_irr(self, cashflows, iterations=100) -> float:
        rate = 0.1
        for _ in range(iterations):
            npv = sum([cf / (1 + rate)**i for i, cf in enumerate(cashflows)])
            d_npv = sum([-i * cf / (1 + rate)**(i + 1) for i, cf in enumerate(cashflows)])
            new_rate = rate - npv / d_npv
            if abs(new_rate - rate) < 0.0001:
                return new_rate
            rate = new_rate
        return rate

    def sensitivity_matrix(self, noi: float, base_discount: float, base_growth: float) -> Dict[str, List[List[float]]]:
        # Vary rates ±200bps
        discount_range = [base_discount + i*0.01 for i in range(-2, 3)]
        growth_range = [base_growth + i*0.01 for i in range(-2, 3)]
        
        matrix = []
        for d in discount_range:
            row = []
            for g in growth_range:
                res = self.calculate(noi, g, d, terminal_cap_rate=0.08, hold_years=10)
                row.append(res.total_value)
            matrix.append(row)
            
        return {
            "matrix": matrix,
            "discounts": discount_range,
            "growths": growth_range
        }
