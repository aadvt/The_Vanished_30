import io
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.units import inch

def generate_simulation_report(data):
    """
    Generates a professional PDF report using ReportLab.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=18)
    
    styles = getSampleStyleSheet()
    
    # Custom Styles
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor("#10381A"),
        spaceAfter=12,
        alignment=1 # Center
    )
    
    header_style = ParagraphStyle(
        'HeaderStyle',
        parent=styles['Heading2'],
        fontSize=18,
        textColor=colors.HexColor("#10B981"),
        spaceBefore=12,
        spaceAfter=6
    )
    
    body_style = styles['Normal']
    body_style.fontSize = 11
    body_style.leading = 14
    
    elements = []
    
    # 1. Title & Metadata
    elements.append(Paragraph("LUMINOUS REAL ESTATE ENGINE", title_style))
    elements.append(Paragraph("Advanced Macroeconomic Simulation Report", styles['Italic']))
    elements.append(Spacer(1, 0.2*inch))
    
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    elements.append(Paragraph(f"Generated on: {timestamp}", body_style))
    elements.append(Paragraph(f"Target Region: {data.get('region', 'National')}", body_style))
    elements.append(Spacer(1, 0.3*inch))
    
    # 2. Input Parameters
    elements.append(Paragraph("1. SCENARIO PARAMETERS", header_style))
    shocks = data.get('shock_params', {})
    param_data = [
        ["Variable", "Input Shock / Level"],
        ["Repo Rate Move", f"{shocks.get('rate_change_bps', 0)} BPS"],
        ["Inflation Pulse", f"{shocks.get('inflation_change_pct', 0)}%"],
        ["GDP Shock (Demand)", f"{shocks.get('gdp_shock_pct', 0)}%"],
    ]
    
    t = Table(param_data, colWidths=[2.5*inch, 3*inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor("#10381A")),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 0.4*inch))
    
    # 3. Monte Carlo Output
    elements.append(Paragraph("2. PROBABILISTIC OUTCOMES", header_style))
    elements.append(Paragraph("10,000 Iterations across bifurcated risk variables.", body_style))
    elements.append(Spacer(1, 0.1*inch))
    
    mc_data = [
        ["Confidence Level / Metric", "Projected Value"],
        ["Median Projected Value (P50)", f"INR {data.get('p50', 0):,.2f}"],
        ["Lower Bound (P5)", f"INR {data.get('p5', 0):,.2f}"],
        ["Upper Bound (P95)", f"INR {data.get('p95', 0):,.2f}"],
        ["Probability of Impairment", f"{(data.get('prob_loss', 0) * 100):.2f}%"],
    ]
    
    t2 = Table(mc_data, colWidths=[2.5*inch, 3*inch])
    t2.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#10381A")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
    ]))
    elements.append(t2)
    elements.append(Spacer(1, 0.4*inch))
    
    # 4. Narrative Analysis
    if data.get('narrative'):
        elements.append(Paragraph("3. AI EXECUTIVE SUMMARY", header_style))
        elements.append(Paragraph(data.get('narrative'), body_style))
    
    # Bottom Footer Note
    elements.append(Spacer(1, 0.5*inch))
    elements.append(Paragraph("CONFIDENTIAL | LUMINOUS RE ENGINE V3.1", styles['Normal']))
    
    doc.build(elements)
    
    pdf_value = buffer.getvalue()
    buffer.close()
    return pdf_value
