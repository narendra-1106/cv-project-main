import asyncio
import io
import cv2
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

# 1. Test health endpoint
res_health = client.get("/api/v1/health")
print("Health status:", res_health.status_code)
print("Health body:", res_health.json())

# 2. Test inference/analyze endpoint with test image
with open("../data/exdark/images/sample_lowlight.jpg", "rb") as f:
    files = {"file": ("sample_lowlight.jpg", f, "image/jpeg")}
    res = client.post("/api/v1/inference/analyze", files=files)

print("Inference status:", res.status_code)
data = res.json()
print("Success:", data.get("success"))
print("Filename:", data.get("filename"))
print("Dimensions:", data.get("image_dimensions"))
print("Conditions count:", len(data.get("conditions", [])))
for cond in data.get("conditions", []):
    print(f" - [{cond['id']}] status: {cond['status']}, latency: {cond.get('latency_ms')} ms, has_image_url: {bool(cond.get('image_url'))}")
