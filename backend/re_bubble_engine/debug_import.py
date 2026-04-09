try:
    from fpdf import FPDF
    print("SUCCESS: FPDF imported correctly")
    pdf = FPDF()
    print("SUCCESS: FPDF instantiated")
except ImportError as e:
    print(f"ERROR: ImportError: {e}")
except Exception as e:
    print(f"ERROR: General Error: {e}")
