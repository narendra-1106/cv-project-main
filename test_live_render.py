import requests

url = "https://cv-project-main.onrender.com/api/v1/inference/analyze"
with open("data/exdark/images/sample_lowlight.jpg", "rb") as f:
    res = requests.post(url, files={"file": ("test.jpg", f, "image/jpeg")}, timeout=120)

data = res.json()
for c in data.get("conditions", []):
    print(c["name"])
    print("  Status:", c["status"])
    print("  Badge:", c.get("badge"))
    print("  Error:", c.get("error_message"))
    print("  Detection available:", c.get("detection_available"))
    print("  Detection error:", c.get("detection_error"))
