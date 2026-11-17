from fastapi import APIRouter
from app.api.v1.endpoints import health, inference

api_router = APIRouter()

# Register endpoint routers
api_router.include_router(health.router, prefix="", tags=["System"])
api_router.include_router(inference.router, prefix="", tags=["Inference"])
