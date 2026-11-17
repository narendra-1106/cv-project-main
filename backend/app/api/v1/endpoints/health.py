import sys
import datetime
from fastapi import APIRouter
from app.core.config import settings

router = APIRouter()


@router.get("/health", tags=["System"])
async def get_system_health():
    """
    Returns the real-time operational status of the LUXVISION AI backend,
    including Python runtime and hardware accelerator detection.
    """
    cuda_available = False
    device_name = "CPU (PyTorch not loaded or CUDA unavailable)"
    torch_version = "Not loaded"
    
    try:
        import torch
        torch_version = torch.__version__
        cuda_available = torch.cuda.is_available()
        if cuda_available:
            device_name = torch.cuda.get_device_name(0)
        else:
            device_name = "CPU Fallback"
    except ImportError:
        pass

    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "runtime": {
            "python_version": sys.version.split(" ")[0],
            "torch_version": torch_version,
            "cuda_available": cuda_available,
            "device": device_name
        },
        "services": {
            "api_gateway": "online",
            "database": "configured",
            "task_queue": "configured"
        }
    }

