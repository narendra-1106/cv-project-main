from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    # Application Info
    APP_NAME: str = "LUXVISION AI Backend"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"
    
    # Server Binding
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000
    SECRET_KEY: str = "default_dev_secret_key_change_in_production"
    
    # CORS Origins (comma-separated string or list)
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
    
    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    # Supabase Settings
    SUPABASE_URL: str = Field(default="", description="Supabase project URL")
    SUPABASE_ANON_KEY: str = Field(default="", description="Supabase anon public key")
    SUPABASE_SERVICE_ROLE_KEY: str = Field(default="", description="Supabase service role key")
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/luxvision",
        description="Async PostgreSQL connection string"
    )

    # Storage Buckets
    SUPABASE_RAW_BUCKET: str = "raw-images"
    SUPABASE_ENHANCED_BUCKET: str = "enhanced-images"
    SUPABASE_EXPORTS_BUCKET: str = "benchmark-exports"

    # Redis & Celery
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"

    # ML Execution
    DEVICE: str = "cuda"
    TORCH_PRECISION: str = "fp16"
    YOLO_WEIGHTS_PATH: str = "app/ml/weights/yolo11n-exdark.pt"
    ZERO_DCE_WEIGHTS_PATH: str = "app/ml/weights/zero_dce.pth"
    RETINEXFORMER_WEIGHTS_PATH: str = "app/ml/weights/retinexformer.pth"

    # Fixed Research Hyperparameters
    YOLO_CONF_THRESHOLD: float = 0.25
    YOLO_IOU_THRESHOLD: float = 0.45
    YOLO_INPUT_SIZE: int = 640

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"


settings = Settings()

