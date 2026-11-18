import os
import base64
import logging
from typing import Dict, Any, List
from fastapi import APIRouter, UploadFile, File, HTTPException, status
import numpy as np
import cv2
from pathlib import Path
from app.ml.enhancement.clahe import CLAHEEnhancer, calculate_shannon_entropy
from app.ml.enhancement.zero_dce import ZeroDCEEnhancer
from app.ml.enhancement.retinexformer import RetinexformerEnhancer
from app.ml.detection.yolo11 import YOLO11Detector

logger = logging.getLogger("luxvision.api.inference")

router = APIRouter()

# Instantiate singletons for enhancement engines
clahe_enhancer = CLAHEEnhancer(clip_limit=3.0, tile_grid_size=(8, 8))

# Checkpoint path for Zero-DCE (located in app/ml/weights/zero_dce.pth)
ZERO_DCE_WEIGHTS = str(Path(__file__).resolve().parents[3] / "ml" / "weights" / "zero_dce.pth")
zero_dce_enhancer = ZeroDCEEnhancer(weights_path=ZERO_DCE_WEIGHTS)

# Checkpoint path for Retinexformer (located in app/ml/weights/retinexformer.pth)
RETINEXFORMER_WEIGHTS = str(Path(__file__).resolve().parents[3] / "ml" / "weights" / "retinexformer.pth")
retinexformer_enhancer = RetinexformerEnhancer(weights_path=RETINEXFORMER_WEIGHTS)

# Checkpoint path for YOLO11 (located in app/ml/weights/yolo11n.pt)
YOLO11_WEIGHTS = str(Path(__file__).resolve().parents[3] / "ml" / "weights" / "yolo11n.pt")
yolo11_detector = YOLO11Detector(weights_path=YOLO11_WEIGHTS)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def encode_image_to_base64_url(image_rgb: np.ndarray, format_ext: str = ".jpg") -> str:
    """Encodes an RGB NumPy image into a base64 Data URL for zero-latency browser rendering."""
    image_bgr = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2BGR)
    success, buffer = cv2.imencode(format_ext, image_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), 92])
    if not success:
        raise ValueError("Failed to encode image to buffer.")
    b64_str = base64.b64encode(buffer).decode("utf-8")
    mime = "image/png" if format_ext == ".png" else "image/jpeg"
    return f"data:{mime};base64,{b64_str}"


def run_yolo_detection(image_rgb: np.ndarray, format_ext: str = ".jpg") -> Dict[str, Any]:
    """Runs YOLO11 object detection and returns annotated image URL and metrics."""
    if not yolo11_detector.is_loaded:
        return {
            "annotated_image_url": None,
            "detections": [],
            "detection_count": 0,
            "avg_confidence": 0.0,
            "class_counts": {},
            "detection_latency_ms": None,
            "detection_available": False,
            "detection_error": yolo11_detector.load_error or "YOLO11 model not loaded"
        }

    try:
        ann_rgb, detections, det_latency, summary = yolo11_detector.detect(image_rgb)
        ann_data_url = encode_image_to_base64_url(ann_rgb, format_ext)
        return {
            "annotated_image_url": ann_data_url,
            "detections": detections,
            "detection_count": summary["count"],
            "avg_confidence": summary["avg_confidence"],
            "class_counts": summary["class_counts"],
            "detection_latency_ms": det_latency,
            "detection_available": True
        }
    except Exception as err:
        logger.error(f"YOLO11 detection execution failed: {err}", exc_info=True)
        return {
            "annotated_image_url": None,
            "detections": [],
            "detection_count": 0,
            "avg_confidence": 0.0,
            "class_counts": {},
            "detection_latency_ms": None,
            "detection_available": False,
            "detection_error": str(err)
        }


@router.post("/inference/analyze", tags=["Inference"])
def analyze_image(
    file: UploadFile = File(..., description="Dark low-light image file (JPEG or PNG)")
):
    """
    Accepts a dark image, processes it through CLAHE, Zero-DCE, and Retinexformer on the same original frame,
    and runs YOLO11 object detection on all conditions to benchmark downstream mAP/detection yield.
    Runs in a worker thread so the main asyncio event loop remains fully responsive for health checks.
    """
    # 1. Validate file extension
    filename = file.filename or "upload.jpg"
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported image format '{ext}'. Please upload JPG, PNG, or WebP."
        )

    # 2. Read and decode original image buffer
    try:
        contents = file.file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img_bgr is None:
            raise ValueError("Corrupted image data.")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to decode image: {str(e)}"
        )

    # Convert to standard RGB format
    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    height, width, _ = img_rgb.shape
    save_ext = ext if ext in [".jpg", ".png"] else ".jpg"

    # 3. Baseline: Condition 1 (Original)
    orig_entropy = round(calculate_shannon_entropy(img_rgb), 3)
    orig_data_url = encode_image_to_base64_url(img_rgb, save_ext)
    orig_detection = run_yolo_detection(img_rgb, save_ext)

    orig_condition: Dict[str, Any] = {
        "id": "original",
        "condition_index": 1,
        "name": "Condition 1: Original Low-Light",
        "method": "Raw Baseline",
        "status": "ready",
        "image_url": orig_data_url,
        "latency_ms": 0.0,
        "entropy": orig_entropy,
        "description": "Unmodified low-light image establishing baseline detection mAP.",
        **orig_detection
    }

    # 4. Condition 2: CLAHE Enhancement & Detection
    enhanced_clahe_rgb, clahe_latency_ms, clahe_meta = clahe_enhancer.enhance(img_rgb)
    clahe_data_url = encode_image_to_base64_url(enhanced_clahe_rgb, save_ext)
    clahe_detection = run_yolo_detection(enhanced_clahe_rgb, save_ext)

    clahe_condition: Dict[str, Any] = {
        "id": "clahe",
        "condition_index": 2,
        "name": "Condition 2: CLAHE",
        "method": "Classical Heuristic (CIELAB)",
        "status": "ready",
        "image_url": clahe_data_url,
        "latency_ms": clahe_latency_ms,
        "entropy": clahe_meta["enhanced_entropy"],
        "entropy_gain": clahe_meta["entropy_gain"],
        "hyperparameters": {
            "clip_limit": clahe_meta["clip_limit"],
            "tile_grid_size": clahe_meta["tile_grid_size"]
        },
        "description": "Luminance channel contrast equalized in CIELAB color space.",
        **clahe_detection
    }

    # 5. Condition 3: Zero-DCE Enhancement & Detection
    if zero_dce_enhancer.is_loaded:
        try:
            enhanced_zdce_rgb, zdce_latency_ms, zdce_meta = zero_dce_enhancer.enhance(img_rgb)
            zdce_data_url = encode_image_to_base64_url(enhanced_zdce_rgb, save_ext)
            zdce_detection = run_yolo_detection(enhanced_zdce_rgb, save_ext)

            zero_dce_condition: Dict[str, Any] = {
                "id": "zero_dce",
                "condition_index": 3,
                "name": "Condition 3: Zero-DCE",
                "method": "Deep Curve Estimation (CVPR 2020)",
                "status": "ready",
                "image_url": zdce_data_url,
                "latency_ms": zdce_latency_ms,
                "entropy": zdce_meta["enhanced_entropy"],
                "entropy_gain": zdce_meta["entropy_gain"],
                "device": zdce_meta["device"],
                "description": "Unsupervised high-order curve estimation iterated 8 times.",
                **zdce_detection
            }
        except Exception as zdce_err:
            zero_dce_condition = {
                "id": "zero_dce",
                "condition_index": 3,
                "name": "Condition 3: Zero-DCE",
                "method": "Deep Curve Estimation",
                "status": "failed",
                "badge": "Inference error",
                "error_message": f"Zero-DCE inference failed: {str(zdce_err)}",
                "latency_ms": None,
                "image_url": None,
                "description": "Zero-DCE inference encountered an execution error.",
                "annotated_image_url": None,
                "detections": [],
                "detection_count": 0,
                "avg_confidence": 0.0,
                "class_counts": {},
                "detection_latency_ms": None
            }
    else:
        zero_dce_condition = {
            "id": "zero_dce",
            "condition_index": 3,
            "name": "Condition 3: Zero-DCE",
            "method": "Deep Curve Estimation",
            "status": "unavailable",
            "badge": "Checkpoint missing",
            "error_message": zero_dce_enhancer.load_error or "Zero-DCE checkpoint file missing.",
            "latency_ms": None,
            "image_url": None,
            "description": "Zero-DCE pretrained weights not found on server.",
            "annotated_image_url": None,
            "detections": [],
            "detection_count": 0,
            "avg_confidence": 0.0,
            "class_counts": {},
            "detection_latency_ms": None
        }

    # 6. Condition 4: Retinexformer Enhancement & Detection
    if retinexformer_enhancer.is_loaded:
        try:
            enhanced_retinex_rgb, retinex_latency_ms, retinex_meta = retinexformer_enhancer.enhance(img_rgb)
            retinex_data_url = encode_image_to_base64_url(enhanced_retinex_rgb, save_ext)
            retinex_detection = run_yolo_detection(enhanced_retinex_rgb, save_ext)

            retinex_condition: Dict[str, Any] = {
                "id": "retinexformer",
                "condition_index": 4,
                "name": "Condition 4: Retinexformer",
                "method": "Illumination-Guided Transformer (ICCV 2023)",
                "status": "ready",
                "image_url": retinex_data_url,
                "latency_ms": retinex_latency_ms,
                "entropy": retinex_meta["enhanced_entropy"],
                "entropy_gain": retinex_meta["entropy_gain"],
                "device": retinex_meta["device"],
                "description": "One-stage Retinex Transformer with Illumination-Guided Self-Attention.",
                **retinex_detection
            }
        except Exception as retinex_err:
            retinex_condition = {
                "id": "retinexformer",
                "condition_index": 4,
                "name": "Condition 4: Retinexformer",
                "method": "Illumination-Guided Transformer",
                "status": "failed",
                "badge": "Inference error",
                "error_message": f"Retinexformer inference failed: {str(retinex_err)}",
                "latency_ms": None,
                "image_url": None,
                "description": "Retinexformer inference encountered an execution error.",
                "annotated_image_url": None,
                "detections": [],
                "detection_count": 0,
                "avg_confidence": 0.0,
                "class_counts": {},
                "detection_latency_ms": None
            }
    else:
        retinex_condition = {
            "id": "retinexformer",
            "condition_index": 4,
            "name": "Condition 4: Retinexformer",
            "method": "Illumination-Guided Transformer",
            "status": "unavailable",
            "badge": "Checkpoint missing",
            "error_message": retinexformer_enhancer.load_error or "Retinexformer checkpoint file missing.",
            "latency_ms": None,
            "image_url": None,
            "description": "Retinexformer pretrained weights not found on server.",
            "annotated_image_url": None,
            "detections": [],
            "detection_count": 0,
            "avg_confidence": 0.0,
            "class_counts": {},
            "detection_latency_ms": None
        }

    # 7. Assemble 4 comparative conditions
    conditions: List[Dict[str, Any]] = [
        orig_condition,
        clahe_condition,
        zero_dce_condition,
        retinex_condition
    ]

    return {
        "success": True,
        "filename": filename,
        "image_dimensions": {
            "width": width,
            "height": height
        },
        "conditions": conditions
    }
