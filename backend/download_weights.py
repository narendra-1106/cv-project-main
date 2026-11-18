"""
Weight auto-downloader for LUXVISION AI
Run this as a build/startup step on Render (or any server) to fetch the 3 pretrained checkpoints.
"""
import os
import sys
import urllib.request

WEIGHTS_DIR = os.path.join(os.path.dirname(__file__), "app", "ml", "weights")
os.makedirs(WEIGHTS_DIR, exist_ok=True)

MODELS = [
    {
        "name": "Zero-DCE",
        "filename": "zero_dce.pth",
        "url": "https://github.com/Li-Chongyi/Zero-DCE/raw/master/Zero-DCE_code/snapshots/Epoch99.pth",
    },
    {
        "name": "Retinexformer (LOL-v1)",
        "filename": "retinexformer.pth",
        "url": "https://huggingface.co/CaiYuanhao/Retinexformer/resolve/main/LOL_v1.pth",
    },
    {
        "name": "YOLO11-nano",
        "filename": "yolo11n.pt",
        "url": "https://github.com/ultralytics/assets/releases/download/v8.3.0/yolo11n.pt",
    },
]


def download_file(url: str, dest: str, name: str):
    if os.path.exists(dest):
        size_kb = os.path.getsize(dest) / 1024
        print(f"  [SKIP] {name} already exists ({size_kb:.1f} KB)")
        return True

    print(f"  [DOWN] Downloading {name} ...")
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=120) as resp, open(dest, "wb") as f:
            total = int(resp.headers.get("Content-Length", 0))
            downloaded = 0
            chunk = 65536
            while True:
                data = resp.read(chunk)
                if not data:
                    break
                f.write(data)
                downloaded += len(data)
                if total:
                    pct = downloaded / total * 100
                    print(f"\r    {pct:.1f}%  ({downloaded//1024} KB / {total//1024} KB)", end="", flush=True)
        print()
        size_kb = os.path.getsize(dest) / 1024
        print(f"  [OK]   {name} saved ({size_kb:.1f} KB)")
        return True
    except Exception as e:
        print(f"  [ERR]  Failed to download {name}: {e}")
        if os.path.exists(dest):
            os.remove(dest)
        return False


if __name__ == "__main__":
    print("=" * 60)
    print("LUXVISION AI — Model Weight Downloader")
    print(f"Target directory: {WEIGHTS_DIR}")
    print("=" * 60)
    errors = []
    for m in MODELS:
        dest = os.path.join(WEIGHTS_DIR, m["filename"])
        ok = download_file(m["url"], dest, m["name"])
        if not ok:
            errors.append(m["name"])

    print("=" * 60)
    if errors:
        print(f"WARNING: Failed to download: {', '.join(errors)}")
        sys.exit(1)
    else:
        print("All model weights ready.")
        sys.exit(0)
