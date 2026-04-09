import sys
import os

print(f"Python Executable: {sys.executable}")
print(f"Python Version: {sys.version}")
print(f"Search path: {sys.path}")

try:
    import fpdf
    print(f"SUCCESS: fpdf found at {fpdf.__file__}")
    from fpdf import FPDF
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", size=12)
    pdf.cell(200, 10, txt="Test PDF", ln=1, align="C")
    out = pdf.output()
    print(f"SUCCESS: Result type: {type(out)}")
except ImportError as e:
    print(f"ERROR: ImportError: {e}")
except Exception as e:
    print(f"ERROR: General error: {e}")
