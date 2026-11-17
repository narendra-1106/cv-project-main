import os
import time
from typing import Tuple, Dict, Any, Optional
import numpy as np
import torch
import torch.nn as nn
from app.ml.enhancement.base import BaseEnhancer
from app.ml.enhancement.clahe import calculate_shannon_entropy


class enhance_net_nopool(nn.Module):
    """
    Official Zero-DCE (Zero-Reference Deep Curve Estimation) Architecture.
    A lightweight CNN without pooling layers that estimates high-order tone curves.
    Reference: Guo et al., CVPR 2020.
    """

    def __init__(self):
        super(enhance_net_nopool, self).__init__()
        self.relu = nn.ReLU(inplace=True)

        number_f = 32
        self.e_conv1 = nn.Conv2d(3, number_f, 3, 1, 1, bias=True)
        self.e_conv2 = nn.Conv2d(number_f, number_f, 3, 1, 1, bias=True)
        self.e_conv3 = nn.Conv2d(number_f, number_f, 3, 1, 1, bias=True)
        self.e_conv4 = nn.Conv2d(number_f, number_f, 3, 1, 1, bias=True)
        self.e_conv5 = nn.Conv2d(number_f * 2, number_f, 3, 1, 1, bias=True)
        self.e_conv6 = nn.Conv2d(number_f * 2, number_f, 3, 1, 1, bias=True)
        self.e_conv7 = nn.Conv2d(number_f * 2, 24, 3, 1, 1, bias=True)

    def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        x1 = self.relu(self.e_conv1(x))
        x2 = self.relu(self.e_conv2(x1))
        x3 = self.relu(self.e_conv3(x2))
        x4 = self.relu(self.e_conv4(x3))

        x5 = self.relu(self.e_conv5(torch.cat([x3, x4], 1)))
        x6 = self.relu(self.e_conv6(torch.cat([x2, x5], 1)))

        x_r = torch.tanh(self.e_conv7(torch.cat([x1, x6], 1)))
        r1, r2, r3, r4, r5, r6, r7, r8 = torch.split(x_r, 3, dim=1)

        # 8-step iterative curve estimation
        x = x + r1 * (torch.pow(x, 2) - x)
        x = x + r2 * (torch.pow(x, 2) - x)
        x = x + r3 * (torch.pow(x, 2) - x)
        enhance_image_1 = x + r4 * (torch.pow(x, 2) - x)
        x = enhance_image_1 + r5 * (torch.pow(enhance_image_1, 2) - enhance_image_1)
        x = x + r6 * (torch.pow(x, 2) - x)
        x = x + r7 * (torch.pow(x, 2) - x)
        enhance_image = x + r8 * (torch.pow(x, 2) - x)

        return enhance_image, x_r


class ZeroDCEEnhancer(BaseEnhancer):
    """
    Condition 3: Zero-DCE (Deep Curve Estimation) Enhancer.
    Loads official pretrained weights and executes inference on CPU or GPU.
    """

    def __init__(self, weights_path: str = "app/ml/weights/zero_dce.pth"):
        super().__init__(name="Zero-DCE")
        self.weights_path = weights_path
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model: Optional[enhance_net_nopool] = None
        self.is_loaded: bool = False
        self.load_error: Optional[str] = None

        self._load_model()

    def _load_model(self):
        """Attempts to load model weights cleanly."""
        if not os.path.exists(self.weights_path):
            self.is_loaded = False
            self.load_error = f"Checkpoint file not found at {self.weights_path}"
            return

        try:
            model = enhance_net_nopool().to(self.device)
            # weights_only=True when possible, fallback for older PyTorch
            try:
                state_dict = torch.load(self.weights_path, map_location=self.device, weights_only=True)
            except Exception:
                state_dict = torch.load(self.weights_path, map_location=self.device)

            model.load_state_dict(state_dict)
            model.eval()
            self.model = model
            self.is_loaded = True
            self.load_error = None
        except Exception as e:
            self.is_loaded = False
            self.load_error = f"Failed to load Zero-DCE weights: {str(e)}"

    def enhance(self, image_rgb: np.ndarray) -> Tuple[np.ndarray, float, Dict[str, Any]]:
        """
        Enhance image using Zero-DCE.

        Args:
            image_rgb (np.ndarray): Input RGB uint8 array [H, W, 3].

        Returns:
            Tuple of (enhanced_rgb, latency_ms, metadata).
        """
        if not self.is_loaded or self.model is None:
            raise RuntimeError(self.load_error or "Zero-DCE model is not loaded.")

        start_time = time.perf_counter()

        # Step 1: Normalize uint8 [0, 255] to float32 [0.0, 1.0] tensor
        img_float = (image_rgb / 255.0).astype(np.float32)
        tensor_in = torch.from_numpy(img_float).permute(2, 0, 1).unsqueeze(0).to(self.device)

        # Step 2: Model forward pass (no gradients)
        with torch.no_grad():
            enhanced_tensor, _ = self.model(tensor_in)

        # Step 3: Clamp and convert back to uint8 numpy array [H, W, 3]
        enhanced_tensor = torch.clamp(enhanced_tensor, 0.0, 1.0)
        enhanced_np = enhanced_tensor.squeeze(0).permute(1, 2, 0).cpu().numpy()
        enhanced_rgb = (enhanced_np * 255.0).astype(np.uint8)

        elapsed_ms = (time.perf_counter() - start_time) * 1000.0

        # Calculate metrics
        orig_entropy = calculate_shannon_entropy(image_rgb)
        enh_entropy = calculate_shannon_entropy(enhanced_rgb)

        metadata = {
            "device": str(self.device),
            "iterations": 8,
            "original_entropy": round(orig_entropy, 3),
            "enhanced_entropy": round(enh_entropy, 3),
            "entropy_gain": round(enh_entropy - orig_entropy, 3),
            "output_dimensions": [enhanced_rgb.shape[1], enhanced_rgb.shape[0]]
        }

        return enhanced_rgb, round(elapsed_ms, 2), metadata

