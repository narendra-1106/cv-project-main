import os
import time
from typing import Tuple, Dict, Any, Optional
from inspect import signature
import numpy as np
import torch
import torch.nn.functional as F

from app.ml.enhancement.base import BaseEnhancer
from app.ml.enhancement.clahe import calculate_shannon_entropy
from app.ml.enhancement.retinexformer_arch import RetinexFormer


class RetinexformerEnhancer(BaseEnhancer):
    """
    Condition 4: Retinexformer (One-stage Retinex-based Transformer).
    Utilizes Illumination Estimator + Illumination-Guided Multi-Head Self-Attention (IG-MSA).
    Paper: Cai et al., ICCV 2023.
    """

    def __init__(self, weights_path: str = "app/ml/weights/retinexformer.pth"):
        super().__init__(name="Retinexformer")
        self.weights_path = weights_path
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model: Optional[RetinexFormer] = None
        self.is_loaded: bool = False
        self.load_error: Optional[str] = None

        self._load_model()

    def _load_model(self):
        """Attempts to instantiate Retinexformer and load pretrained weights, auto-downloading if missing."""
        if not os.path.exists(self.weights_path):
            try:
                os.makedirs(os.path.dirname(os.path.abspath(self.weights_path)), exist_ok=True)
                url = "https://huggingface.co/CaiYuanhao/Retinexformer/resolve/main/LOL_v1.pth"
                import urllib.request
                req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, timeout=120) as resp, open(self.weights_path, "wb") as f:
                    while True:
                        chunk = resp.read(65536)
                        if not chunk:
                            break
                        f.write(chunk)
            except Exception as dl_err:
                self.is_loaded = False
                self.load_error = f"Checkpoint not found at {self.weights_path} and auto-download failed: {dl_err}"
                return

        try:
            # Hyperparameters matching the official LOL-v1 pretrained checkpoint
            model = RetinexFormer(
                in_channels=3,
                out_channels=3,
                n_feat=40,
                stage=1,
                num_blocks=[1, 2, 2]
            ).to(self.device)

            load_options = {"map_location": self.device}
            if "weights_only" in signature(torch.load).parameters:
                try:
                    checkpoint = torch.load(self.weights_path, weights_only=True, **load_options)
                except Exception:
                    checkpoint = torch.load(self.weights_path, **load_options)
            else:
                checkpoint = torch.load(self.weights_path, **load_options)

            # Checkpoint may be wrapped in 'params' or 'params_ema'
            if isinstance(checkpoint, dict):
                if "params" in checkpoint:
                    state_dict = checkpoint["params"]
                elif "params_ema" in checkpoint:
                    state_dict = checkpoint["params_ema"]
                else:
                    state_dict = checkpoint
            else:
                state_dict = checkpoint

            model.load_state_dict(state_dict, strict=True)
            model.eval()
            self.model = model
            self.is_loaded = True
            self.load_error = None
        except Exception as e:
            self.is_loaded = False
            self.load_error = f"Failed to load Retinexformer weights: {str(e)}"

    def enhance(self, image_rgb: np.ndarray) -> Tuple[np.ndarray, float, Dict[str, Any]]:
        """
        Enhance image using Retinexformer with dimension preservation.

        Args:
            image_rgb (np.ndarray): Input RGB uint8 array [H, W, 3].

        Returns:
            Tuple of (enhanced_rgb, latency_ms, metadata).
        """
        if not self.is_loaded or self.model is None:
            raise RuntimeError(self.load_error or "Retinexformer model is not loaded.")

        start_time = time.perf_counter()

        orig_h, orig_w = image_rgb.shape[:2]

        # Step 1: Normalize uint8 [0, 255] to float32 [0.0, 1.0] tensor
        img_float = (image_rgb / 255.0).astype(np.float32)
        tensor_in = torch.from_numpy(img_float).permute(2, 0, 1).unsqueeze(0).to(self.device)

        # Step 2: Pad input to multiples of 4 (required by transformer downsampling stages)
        pad_h = (-orig_h) % 4
        pad_w = (-orig_w) % 4
        if pad_h > 0 or pad_w > 0:
            mode = "reflect" if orig_h > pad_h and orig_w > pad_w else "replicate"
            tensor_in = F.pad(tensor_in, (0, pad_w, 0, pad_h), mode=mode)

        # Step 3: Forward pass without gradient calculation
        with torch.no_grad():
            output_tensor = self.model(tensor_in)

        # Step 4: Crop back to original dimensions and clamp to [0.0, 1.0]
        output_tensor = output_tensor[..., :orig_h, :orig_w].clamp(0.0, 1.0)
        output_np = output_tensor.squeeze(0).permute(1, 2, 0).cpu().numpy()
        enhanced_rgb = (output_np * 255.0).astype(np.uint8)

        elapsed_ms = (time.perf_counter() - start_time) * 1000.0

        # Calculate metrics
        orig_entropy = calculate_shannon_entropy(image_rgb)
        enh_entropy = calculate_shannon_entropy(enhanced_rgb)

        metadata = {
            "device": str(self.device),
            "architecture": "RetinexFormer (IG-MSA)",
            "n_feat": 40,
            "stage": 1,
            "original_entropy": round(orig_entropy, 3),
            "enhanced_entropy": round(enh_entropy, 3),
            "entropy_gain": round(enh_entropy - orig_entropy, 3),
            "output_dimensions": [enhanced_rgb.shape[1], enhanced_rgb.shape[0]]
        }

        return enhanced_rgb, round(elapsed_ms, 2), metadata
