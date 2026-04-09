import requests
import sys

try:
    url = 'http://127.0.0.1:8000/api/scenario/report'
    payload = {'p50': 500000, 'region': 'Mumbai'}
    print(f"Calling {url}...")
    r = requests.post(url, json=payload, timeout=10)
    print(f"Status: {r.status_code}")
    print(f"Headers: {r.headers}")
    if r.status_code == 200:
        with open('debug_report.pdf', 'wb') as f:
            f.write(r.content)
        print(f"Saved debug_report.pdf ({len(r.content)} bytes)")
        if r.content.startswith(b'%PDF'):
            print("VALID: Starts with %PDF magic bytes.")
        else:
            print(f"INVALID: Content starts with: {r.content[:20]}")
    else:
        print(f"Error Body: {r.text[:200]}")
except Exception as e:
    print(f"EXCEPTION: {e}")
