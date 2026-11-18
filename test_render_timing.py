import urllib.request
import io
import time
from PIL import Image

img = Image.new('RGB', (300, 200), color=(10, 20, 30))
buf = io.BytesIO()
img.save(buf, format='JPEG')
img_bytes = buf.getvalue()

boundary = '----BoundaryTest123'
body = io.BytesIO()
body.write(f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="test.jpg"\r\nContent-Type: image/jpeg\r\n\r\n'.encode())
body.write(img_bytes)
body.write(f'\r\n--{boundary}--\r\n'.encode())

req = urllib.request.Request(
    'https://cv-project-main.onrender.com/api/v1/inference/analyze',
    data=body.getvalue(),
    headers={
        'Content-Type': f'multipart/form-data; boundary={boundary}',
        'Origin': 'https://cv-project-main.vercel.app'
    }
)

t0 = time.time()
print("Testing live Render analyze endpoint...")
try:
    res = urllib.request.urlopen(req, timeout=90)
    print(f"DONE in {time.time()-t0:.2f}s with status {res.getcode()}!")
    import json
    data = json.loads(res.read().decode())
    for c in data.get('conditions', []):
        print(f"  {c.get('id')}: status={c.get('status')} latency={c.get('latency_ms')} det={c.get('detection_count')}")
except Exception as e:
    print(f"FAILED in {time.time()-t0:.2f}s: {e}")
