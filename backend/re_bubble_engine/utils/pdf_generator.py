from fpdf import FPDF
import io
from datetime import datetime

class SimulationReport(FPDF):
    def header(self):
        # Header - Luminous Real Estate Engine
        self.set_fill_color(16, 56, 26) # #10381a dark matcha
        self.rect(0, 0, 210, 40, 'F')
        
        self.set_font('helvetica', 'B', 20)
        self.set_text_color(255, 255, 255)
        self.cell(0, 20, 'LUMINOUS REAL ESTATE ENGINE', ln=1, align='C')
        
        self.set_font('helvetica', 'I', 10)
        self.cell(0, 5, 'Advanced Macroeconomic Simulation Report', ln=1, align='C')
        self.ln(10)

    def footer(self):
        self.set_y(-15)
        self.set_font('helvetica', 'I', 8)
        self.set_text_color(128, 128, 128)
        self.cell(0, 10, f'Page {self.page_no()} | Generated on {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}', align='C')

def generate_simulation_report(data: dict) -> bytes:
    pdf = SimulationReport()
    pdf.add_page()
    
    # Section: Scenario Parameters
    pdf.set_font('helvetica', 'B', 14)
    pdf.set_text_color(16, 56, 26)
    pdf.cell(0, 10, '1. EXECUTION CONTEXT', ln=True)
    pdf.set_font('helvetica', '', 11)
    pdf.set_text_color(0, 0, 0)
    
    region = data.get('region', 'National')
    pdf.cell(0, 7, f'Target Region: {region}', ln=1)
    
    shocks = data.get('shock_params', {})
    pdf.cell(0, 7, f'Repo Rate Move: {shocks.get("rate_change_bps", 0)} BPS', ln=1)
    pdf.cell(0, 7, f'Inflation Pulse: {shocks.get("inflation_change_pct", 0)}%', ln=1)
    pdf.cell(0, 7, f'GDP Shock (Demand): {shocks.get("gdp_shock_pct", 0)}%', ln=1)
    pdf.ln(10)
    
    # Section: Statistical Summary
    pdf.set_font('helvetica', 'B', 14)
    pdf.set_text_color(16, 56, 26)
    pdf.cell(0, 10, '2. MONTE CARLO OUTPUT (10,000 ITERATIONS)', ln=1)
    
    # Table like structure
    pdf.set_font('helvetica', 'B', 10)
    pdf.set_fill_color(240, 240, 240)
    pdf.cell(60, 10, 'Metric', border=1, fill=True)
    pdf.cell(130, 10, 'Value / Level', border=1, fill=True, ln=1)
    
    pdf.set_font('helvetica', '', 10)
    metrics = [
        ('Median Projected Value (P50)', f'INR {data.get("p50", 0):,.2f}'),
        ('Lower Bound (P5)', f'INR {data.get("p5", 0):,.2f}'),
        ('Upper Bound (P95)', f'INR {data.get("p95", 0):,.2f}'),
        ('Probability of Impairment', f'{(data.get("prob_loss", 0) * 100):.2f}%'),
    ]
    
    for label, val in metrics:
        pdf.cell(60, 10, label, border=1)
        pdf.cell(130, 10, val, border=1, ln=1)
    
    pdf.ln(10)
    
    # Section: Methodology (Sector-Specific Logic)
    pdf.set_font('helvetica', 'B', 14)
    pdf.set_text_color(16, 56, 26)
    pdf.cell(0, 10, '3. RISK EVALUATION METHODOLOGY', ln=1)
    
    pdf.set_font('helvetica', '', 11)
    pdf.set_text_color(0, 0, 0)
    
    methodology_text = (
        "The Luminous Engine utilizes a bifurcated risk propagation model to ensure high-fidelity building-level feedback. "
        "Each asset type is evaluated against its most sensitive macroeconomic determinant:\n\n"
        "- RESIDENTIAL & APARTMENTS: Risk is primarily driven by the Price-to-Income (P/I) Ratio and Affordability Index. "
        "A reading above 12.0 in major hubs triggers warning thresholds, while levels exceeding 15.0 indicate extreme stress.\n\n"
        "- COMMERCIAL & OFFICE: Risk is grounded by the Cap Rate Spread over the 10-Year G-Sec yield. "
        "Spreads narrowing below 150 BPS indicate significant yield compression and potential bubble territory."
    )
    pdf.multi_cell(0, 7, methodology_text)
    
    pdf.ln(10)
    
    # Section: Narrative Analysis
    if data.get('narrative'):
        pdf.set_font('helvetica', 'B', 14)
        pdf.set_text_color(16, 56, 26)
        pdf.cell(0, 10, '4. AI NARRATIVE ANALYSIS', ln=1)
        pdf.set_font('helvetica', 'I', 11)
        pdf.set_text_color(50, 50, 50)
        pdf.multi_cell(0, 7, data.get('narrative'))

    return bytes(pdf.output())
