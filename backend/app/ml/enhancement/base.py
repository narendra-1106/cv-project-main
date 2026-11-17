from abc import ABC, abstractmethod
from typing import Dict, Any, Tuple
import numpy as np


class BaseEnhancer(ABC):
    """
    Abstract base class for all image enhancement algorithms.
    Enforces consistent input/output interfaces and execution timing.
    """

    def __init__(self, name: str):
        self.name = name

    @abstractmethod
    def enhance(self, image_rgb: np.ndarray) -> Tuple[np.ndarray, float, Dict[str, Any]]:
        """
        Enhances the input RGB image.

        Args:
            image_rgb (np.ndarray): HxWxC uint8 RGB image array [0, 255].

        Returns:
            Tuple containing:
            - enhanced_rgb (np.ndarray): Enhanced HxWxC uint8 RGB image array.
            - latency_ms (float): Enhancement duration in milliseconds.
            - metadata (Dict[str, Any]): Method-specific hyperparameters and metrics.
        """
        pass

