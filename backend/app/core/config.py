import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Darukaa Site Intelligence API"
    VERSION: str = "0.1.0"
    API_V1_STR: str = ""
    
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-key-change-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://darukaa:darukaa123@localhost:5432/darukaa_db")

    # Sanitize and parse CORS_ORIGINS from comma-separated string or list string
    raw_cors: str = os.getenv("CORS_ORIGINS", "*").strip()
    if raw_cors.startswith("[") and raw_cors.endswith("]"):
        raw_cors = raw_cors[1:-1]
    
    CORS_ORIGINS: list[str] = [
        origin.strip().strip("'\"") 
        for origin in raw_cors.split(",") 
        if origin.strip()
    ]

settings = Settings()