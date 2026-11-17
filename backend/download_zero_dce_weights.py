"""
Download the official Zero-DCE pretrained checkpoint.

Source: Official Zero-DCE repository by Li Chongyi et al. (CVPR 2020)
GitHub: https://github.com/Li-Chongyi/Zero-DCE
Paper:  "Zero-Reference Deep Curve Estimation for Low-Light Image Enhancement"

The weights (Epoch99.pth, ~312 KB) are hosted directly in the official repo.
This script downloads them to backend/app/ml/weights/zero_dce.pth
"""
import os
import sys
import urllib.request

# Official Zero-DCE snapshot from the author's GitHub repository
WEIGHTS_URL = "https://github.com/Li-Chongyi/Zero-DCE/raw/master/Zero-DCE_code/snapshots/Epoch99.pth"

WEIGHTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "app", "ml", "weights")
WEIGHTS_PATH = os.path.join(WEIGHTS_DIR, "zero_dce.pth")


def main():
    os.makedirs(WEIGHTS_DIR, exist_ok=True)

    if os.path.exists(WEIGHTS_PATH):
        size_kb = os.path.getsize(WEIGHTS_PATH) / 1024
        print(f"[OK] Zero-DCE weights already exist at {WEIGHTS_PATH} ({size_kb:.1f} KB)")
        return

    print(f"Downloading Zero-DCE weights from official GitHub repo...")
    print(f"  URL: {WEIGHTS_URL}")
    print(f"  Destination: {WEIGHTS_PATH}")

    try:
        urllib.request.urlretrieve(WEIGHTS_URL, WEIGHTS_PATH)
    except Exception as e:
        print(f"\n[ERROR] Download failed: {e}")
        print("  Please manually download from:")
        print(f"  {WEIGHTS_URL}")
        print(f"  and place as: {WEIGHTS_PATH}")
        sys.exit(1)

    if os.path.exists(WEIGHTS_PATH):
        size_kb = os.path.getsize(WEIGHTS_PATH) / 1024
        print(f"\n[SUCCESS] Zero-DCE weights downloaded: {WEIGHTS_PATH} ({size_kb:.1f} KB)")
    else:
        print("\n[ERROR] Download failed. File not found after download.")
        sys.exit(1)


if __name__ == "__main__":
    main()
