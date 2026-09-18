import json
from typing import Union, List
from pydantic import field_validator
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Darukaa Site Intelligence API"
    VERSION: str = "0.1.0"
    API_V1_STR: str = ""
    
    SECRET_KEY: str = "super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    DATABASE_URL: str = "postgresql://darukaa:darukaa123@localhost:5432/darukaa_db"
    CORS_ORIGINS: Union[str, List[str]] = "*"

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def normalize_database_url(cls, v: str) -> str:
        if v and v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql://", 1)
        return v

    @property
    def database_url(self) -> str:
        return self.DATABASE_URL

    def cors_origin_list(self) -> List[str]:
        if isinstance(self.CORS_ORIGINS, list):
            return self.CORS_ORIGINS
        raw = str(self.CORS_ORIGINS).strip()
        if not raw:
            return ["*"]
        if raw.startswith("[") and raw.endswith("]"):
            try:
                parsed = json.loads(raw)
                if isinstance(parsed, list):
                    return [str(item).strip() for item in parsed]
            except Exception:
                pass
            raw = raw[1:-1]
        return [origin.strip().strip("'\"") for origin in raw.split(",") if origin.strip()]

settings = Settings()