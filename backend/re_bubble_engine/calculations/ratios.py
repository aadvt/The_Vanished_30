from typing import Dict, Any, Optional
from models.macro import MacroSnapshot, RatioSummary

class RatioCalculator:
    def price_to_income(self, median_home_price_lakh: float, annual_income_lakh: float) -> Dict[str, Any]:
        if not annual_income_lakh: return {}
        ratio = median_home_price_lakh / annual_income_lakh
        return {
            "ratio": ratio, 
            "flagged": ratio > 8.0, 
            "threshold": 8.0, 
            "signal": "bubble_risk" if ratio > 8 else "normal", 
            "note": "Indian metro norm 6-12x; national threshold 8x"
        }

    def price_to_rent(self, median_home_price_lakh: float, annual_rent_lakh: float) -> Dict[str, Any]:
        if not annual_rent_lakh: return {}
        ratio = median_home_price_lakh / annual_rent_lakh
        return {
            "ratio": ratio, 
            "flagged": ratio > 28.0, 
            "threshold": 28.0, 
            "signal": "bubble_risk" if ratio > 28 else "normal", 
            "note": "India gross rental yield typically 1.5-3%; P/R>28 implies <3.5% yield"
        }

    def affordability_index(self, annual_income_lakh: float, home_price_lakh: float, home_loan_rate_pct: float) -> Dict[str, Any]:
        if not all([annual_income_lakh, home_price_lakh, home_loan_rate_pct]): return {}
        
        principal = home_price_lakh * 0.80  # 20% down payment assumed
        monthly_rate = home_loan_rate_pct / 1200
        
        # 20-year loan (India standard)
        tenure_months = 240
        emi = (principal * 100000 * monthly_rate * (1+monthly_rate)**tenure_months) / ((1+monthly_rate)**tenure_months - 1)
        
        monthly_income = (annual_income_lakh * 100000) / 12
        pct = emi / monthly_income
        
        return {
            "pct_income": pct, 
            "flagged": pct > 0.50, 
            "emi_monthly": emi, 
            "threshold": 0.50,
            "note": "India: 50% EMI-to-income threshold; 20yr tenure standard"
        }

    def residex_momentum(self, current_index: float, base_index: float = 100.0) -> Dict[str, Any]:
        if not current_index: return {}
        gain_pct = (current_index - base_index) / base_index * 100
        return {
            "gain_pct": gain_pct, 
            "flagged": gain_pct > 60.0, 
            "threshold": 60.0, 
            "signal": "bubble_risk" if gain_pct > 60 else "normal", 
            "note": "60% gain over 2017-18 base signals overheating"
        }

    def compute_all(self, snapshot: MacroSnapshot) -> RatioSummary:
        res_pi = self.price_to_income(snapshot.median_home_price_inr or 0, snapshot.median_household_income_inr or 0)
        # Rent proxy: assume rent is 2.5% of price if not given, but usually we need a specific series
        # For now, we'll leave it or use a default if we had rental data
        res_pr = self.price_to_rent(snapshot.median_home_price_inr or 0, (snapshot.median_home_price_inr or 0) * 0.025)
        
        res_aff = self.affordability_index(
            snapshot.median_household_income_inr or 0, 
            snapshot.median_home_price_inr or 0, 
            snapshot.home_loan_rate or 8.75
        )
        
        res_mom = self.residex_momentum(snapshot.nhb_residex_composite or 0)
        
        flagged = []
        if res_pi.get("flagged"): flagged.append("Price-to-Income")
        if res_pr.get("flagged"): flagged.append("Price-to-Rent")
        if res_aff.get("flagged"): flagged.append("Affordability Gap")
        if res_mom.get("flagged"): flagged.append("Residex Overheat")
        
        return RatioSummary(
            price_income_ratio=res_pi.get("ratio"),
            price_rent_ratio=res_pr.get("ratio"),
            affordability_pct=res_aff.get("pct_income"),
            residex_gain_pct=res_mom.get("gain_pct"),
            bubble_signals_count=len(flagged),
            flagged_signals=flagged
        )
