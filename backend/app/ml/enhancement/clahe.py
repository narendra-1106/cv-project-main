import time
from typing import Tuple, Dict, Any
import numpy as np
import cv2
from app.ml.enhancement.base import BaseEnhancer


def calculate_shannon_entropy(image_rgb: np.ndarray) -> float:
    """
    Calculates the Shannon information entropy of an image.
    Higher entropy indicates richer visible texture and detail.
    """
    gray = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2GRAY)
    hist, _ = np.histogram(gray.ravel(), bins=256, range=(0, 256))
    hist = hist / (hist.sum() + 1e-12)
    # Filter out zero probabilities
    non_zero = hist[hist > 0]
    return float(-np.sum(non_zero * np.log2(non_zero)))


class CLAHEEnhancer(BaseEnhancer):
    """
    Condition 2: Contrast Limited Adaptive Histogram Equalization (CLAHE).
    Converts RGB to CIELAB, equalizes the luminance L* channel with contrast limiting,
    and converts back to RGB.
    """

    def __init__(self, clip_limit: float = 3.0, tile_grid_size: Tuple[int, int] = (8, 8)):
        super().__init__(name="CLAHE")
        self.clip_limit = clip_limit
        self.tile_grid_size = tile_grid_size
        self._clahe = cv2.createCLAHE(
            clipLimit=float(clip_limit),
            tileGridSize=tile_grid_size
        )

    def enhance(self, image_rgb: np.ndarray) -> Tuple[np.ndarray, float, Dict[str, Any]]:
        """
        Enhance image using CIELAB CLAHE.

        Args:
            image_rgb (np.ndarray): Input RGB uint8 array [H, W, 3].

        Returns:
            Tuple of (enhanced_rgb, latency_ms, metadata).
        """
        start_time = time.perf_counter()

        # Step 1: Convert RGB to CIELAB space to decouple luminance from chrominance
        lab = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2LAB)
        l_channel, a_channel, b_channel = cv2.split(lab)

        # Step 2: Apply CLAHE to L* channel only
        l_enhanced = self._clahe.apply(l_channel)

        # Step 3: Merge channels and convert back to RGB
        enhanced_lab = cv2.merge([l_enhanced, a_channel, b_channel])
        enhanced_rgb = cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2RGB)

        elapsed_ms = (time.perf_counter() - start_time) * 1000.0

        # Calculate Shannon entropy metrics
        orig_entropy = calculate_shannon_entropy(image_rgb)
        enh_entropy = calculate_shannon_entropy(enhanced_rgb)

        metadata = {
            "clip_limit": self.clip_limit,
            "tile_grid_size": list(self.tile_grid_size),
            "original_entropy": round(orig_entropy, 3),
            "enhanced_entropy": round(enh_entropy, 3),
            "entropy_gain": round(enh_entropy - orig_entropy, 3)
        }

        return enhanced_rgb, round(elapsed_ms, 2), metadata

