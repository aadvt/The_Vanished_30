import math

class AffordabilityEngine:
    def monthly_emi(self, principal_inr: float, annual_rate_pct: float, tenure_years: int = 20) -> float:
        if annual_rate_pct <= 0: return principal_inr / (tenure_years * 12)
        
        r = annual_rate_pct / 12 / 100
        n = tenure_years * 12
        emi = (principal_inr * r * (1 + r)**n) / ((1 + r)**n - 1)
        return emi

    def max_affordable_price_inr(
        self, 
        annual_income_lakh: float, 
        rate_pct: float, 
        tenure_years: int = 20, 
        emi_limit_pct: float = 0.50
    ) -> float:
        # monthly_income = annual_income_lakh * 100000 / 12
        # max_emi = monthly_income * emi_limit_pct
        # principal = max_emi * ((1+r)**n - 1) / (r * (1+r)**n)
        
        monthly_income = (annual_income_lakh * 100000) / 12
        max_emi = monthly_income * emi_limit_pct
        
        r = rate_pct / 12 / 100
        n = tenure_years * 12
        
        if r <= 0: return max_emi * n
        
        principal = max_emi * ((1 + r)**n - 1) / (r * (1 + r)**n)
        
        # Home price assuming 80% LTV (20% down payment)
        return principal / 0.80

    def affordability_gap_lakh(self, median_price_lakh: float, annual_income_lakh: float, rate_pct: float) -> float:
        max_price = self.max_affordable_price_inr(annual_income_lakh, rate_pct)
        return median_price_lakh - (max_price / 100000)

    def housing_loan_eligibility(self, annual_income_lakh: float, rate_pct: float, tenure_years: int = 20, foir: float = 0.50) -> float:
        # FOIR (Fixed Obligations to Income Ratio) - standard Indian bank metric
        monthly_income = (annual_income_lakh * 100000) / 12
        max_emi = monthly_income * foir
        
        r = rate_pct / 12 / 100
        n = tenure_years * 12
        
        if r <= 0: return max_emi * n
        
        principal = max_emi * ((1 + r)**n - 1) / (r * (1 + r)**n)
        return principal
