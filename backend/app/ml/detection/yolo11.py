"""
YOLO11 Object Detector Module
LUXVISION AI — Low-Light Image Enhancement & Object Detection Platform

Integrates YOLO11 object detection into the comparative evaluation pipeline,
benchmarking detection performance across:
  Condition 1: Original Raw Baseline
  Condition 2: CLAHE
  Condition 3: Zero-DCE
  Condition 4: Retinexformer
"""

import time
import logging
from typing import Tuple, List, Dict, Any, Optional
from pathlib import Path
import numpy as np
import cv2

logger = logging.getLogger("luxvision.ml.detection")

# ExDark 12 categories color mapping (HEX & RGB)
EXDARK_COLOR_MAP: Dict[str, str] = {
    "Bicycle": "#3B82F6",
    "Boat": "#06B6D4",
    "Bottle": "#10B981",
    "Bus": "#F59E0B",
    "Car": "#EF4444",
    "Cat": "#EC4899",
    "Chair": "#8B5CF6",
    "Cup": "#14B8A6",
    "Dog": "#F97316",
    "Motorbike": "#6366F1",
    "People": "#22C55E",
    "Table": "#A855F7",
}

# COCO to ExDark category mapping
COCO_TO_EXDARK: Dict[str, str] = {
    "person": "People",
    "bicycle": "Bicycle",
    "car": "Car",
    "motorcycle": "Motorbike",
    "bus": "Bus",
    "truck": "Car",
    "boat": "Boat",
    "bottle": "Bottle",
    "cup": "Cup",
    "chair": "Chair",
    "couch": "Chair",
    "dining table": "Table",
    "dog": "Dog",
    "cat": "Cat",
}


def hex_to_rgb(hex_code: str) -> Tuple[int, int, int]:
    hex_code = hex_code.lstrip("#")
    return tuple(int(hex_code[i:i+2], 16) for i in (0, 2, 4))


class YOLO11Detector:
    """
    Ultralytics YOLO11 object detector wrapper with ExDark category attribution,
    annotation overlay rendering, and detection metrics aggregation.
    """

    def __init__(self, weights_path: str = "app/ml/weights/yolo11n.pt"):
        self.weights_path = Path(weights_path)
        self.model = None
        self.is_loaded = False
        self.load_error: Optional[str] = None
        self._load_model()

    def _load_model(self):
        try:
            if not self.weights_path.is_file():
                self.load_error = f"YOLO11 weights not found at {self.weights_path.resolve()}"
                logger.warning(self.load_error)
                return

            from ultralytics import YOLO
            self.model = YOLO(str(self.weights_path))
            self.is_loaded = True
            logger.info(f"YOLO11 model loaded successfully from {self.weights_path}")
        except Exception as e:
            self.load_error = f"Error loading YOLO11 model: {str(e)}"
            logger.error(self.load_error, exc_info=True)
            self.is_loaded = False

    def detect(
        self,
        image_rgb: np.ndarray,
        conf: float = 0.25,
        iou: float = 0.45,
        imgsz: int = 640
    ) -> Tuple[np.ndarray, List[Dict[str, Any]], float, Dict[str, Any]]:
        """
        Runs object detection on RGB image array.

        Args:
            image_rgb: Input RGB uint8 numpy array (H, W, 3).
            conf: Confidence threshold (default: 0.25).
            iou: NMS IoU threshold (default: 0.45).
            imgsz: Input inference size.

        Returns:
            annotated_rgb: RGB image with bounding boxes and labels drawn.
            detections: List of detection dictionaries.
            latency_ms: Inference duration in milliseconds.
            summary: Aggregated metrics (count, avg_conf, class_counts).
        """
        if not self.is_loaded or self.model is None:
            raise RuntimeError(self.load_error or "YOLO11 model not initialized.")

        h, w, _ = image_rgb.shape
        t0 = time.perf_counter()

        # Run inference in RGB format
        results = self.model.predict(
            source=image_rgb,
            conf=conf,
            iou=iou,
            imgsz=imgsz,
            verbose=False,
            device="cpu"
        )

        latency_ms = round((time.perf_counter() - t0) * 1000.0, 2)

        detections: List[Dict[str, Any]] = []
        annotated_bgr = cv2.cvtColor(image_rgb.copy(), cv2.COLOR_RGB2BGR)

        if results and len(results) > 0:
            result = results[0]
            boxes = result.boxes

            if boxes is not None and len(boxes) > 0:
                for box in boxes:
                    xyxy = box.xyxy[0].cpu().numpy()
                    x1, y1, x2, y2 = map(int, xyxy)
                    score = float(box.conf[0].cpu().numpy())
                    cls_id = int(box.cls[0].cpu().numpy())
                    raw_name = result.names.get(cls_id, f"class_{cls_id}")

                    # Map to ExDark taxonomy if applicable
                    exdark_name = COCO_TO_EXDARK.get(raw_name.lower(), raw_name.title())
                    is_exdark = raw_name.lower() in COCO_TO_EXDARK
                    hex_color = EXDARK_COLOR_MAP.get(exdark_name, "#06B6D4")
                    rgb_color = hex_to_rgb(hex_color)
                    bgr_color = (rgb_color[2], rgb_color[1], rgb_color[0])

                    det_item = {
                        "box": [x1, y1, x2, y2],
                        "class_name": exdark_name,
                        "raw_class": raw_name,
                        "confidence": round(score, 3),
                        "color": hex_color,
                        "is_exdark": is_exdark
                    }
                    detections.append(det_item)

                    # Draw stylish bounding box
                    cv2.rectangle(annotated_bgr, (x1, y1), (x2, y2), bgr_color, 2, lineType=cv2.LINE_AA)

                    # Draw label background tag
                    label = f"{exdark_name} {score*100:.0f}%"
                    font = cv2.FONT_HERSHEY_SIMPLEX
                    font_scale = max(0.42, min(0.65, w / 1200.0))
                    thickness = 1
                    (text_w, text_h), baseline = cv2.getTextSize(label, font, font_scale, thickness)

                    tag_y1 = max(0, y1 - text_h - 6)
                    tag_y2 = tag_y1 + text_h + 6
                    tag_x2 = min(w, x1 + text_w + 8)

                    # Draw filled rectangle for label header
                    cv2.rectangle(annotated_bgr, (x1, tag_y1), (tag_x2, tag_y2), bgr_color, -1)
                    # Text in white / high contrast
                    cv2.putText(
                        annotated_bgr,
                        label,
                        (x1 + 4, tag_y2 - 4),
                        font,
                        font_scale,
                        (0, 0, 0) if (rgb_color[0]*0.299 + rgb_color[1]*0.587 + rgb_color[2]*0.114) > 160 else (255, 255, 255),
                        thickness,
                        lineType=cv2.LINE_AA
                    )

        annotated_rgb = cv2.cvtColor(annotated_bgr, cv2.COLOR_BGR2RGB)

        # Calculate summary metrics
        count = len(detections)
        avg_conf = round(float(np.mean([d["confidence"] for d in detections])), 3) if count > 0 else 0.0
        class_counts: Dict[str, int] = {}
        for d in detections:
            class_counts[d["class_name"]] = class_counts.get(d["class_name"], 0) + 1

        summary = {
            "count": count,
            "avg_confidence": avg_conf,
            "class_counts": class_counts
        }

        return annotated_rgb, detections, latency_ms, summary
