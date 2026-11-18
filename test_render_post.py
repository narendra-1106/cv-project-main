import urllib.request
import io
import time
from PIL import Image

# create test image
img = Image.new('RGB', (400, 300), color=(20, 20, 40))
buf = io.BytesIO()
img.save(buf, format='JPEG')
img_bytes = buf.getvalue()

boundary = '----WebKitFormBoundaryXyZ123'
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
print("Sending POST /api/v1/inference/analyze to Render...")
try:
    res = urllib.request.urlopen(req, timeout=120)
    print(f"Success! Status: {res.getcode()} took {time.time()-t0:.2f}s")
    data = res.read().decode()
    print("Response len:", len(data))
    import json
    parsed = json.loads(data)
    print("Conditions returned:", [c['id'] + ': ' + c['status'] for c in parsed['conditions']])
except urllib.error.HTTPError as e:
    print(f"HTTPError: {e.code} took {time.time()-t0:.2f}s")
    print("Body:", e.read().decode())
except Exception as e:
    print(f"Exception: {e} took {time.time()-t0:.2f}s")
