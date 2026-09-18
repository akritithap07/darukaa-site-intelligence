import json
from typing import Union, List
from pydantic import field_validator
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Darukaa Site Intelligence API"
    VERSION: str = "0.1.0"
    API_V1_STR: str = ""
    
    SECRET_KEY: str = "super-secret-key-change-in-production"
    JWT_SECRET: str = "super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    JWT_EXPIRE_MINUTES: int = 60 * 24 * 7
    
    DATABASE_URL: str = "postgresql://darukaa:darukaa123@localhost:5432/darukaa_db"
    CORS_ORIGINS: Union[str, List[str]] = "*"

    GBIF_BASE_URL: str = "https://api.gbif.org/v1/occurrence/search"
    NASA_POWER_BASE_URL: str = "https://power.larc.nasa.gov/api/temporal/daily/point"

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def normalize_database_url(cls, v: str) -> str:
        if v and v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql://", 1)
        return v

    @property
    def database_url(self) -> str:
        return self.DATABASE_URL

    @property
    def jwt_secret(self) -> str:
        return self.JWT_SECRET or self.SECRET_KEY

    @property
    def jwt_algorithm(self) -> str:
        return self.JWT_ALGORITHM or self.ALGORITHM

    @property
    def jwt_expire_minutes(self) -> int:
        return self.JWT_EXPIRE_MINUTES or self.ACCESS_TOKEN_EXPIRE_MINUTES

    @property
    def gbif_base_url(self) -> str:
        return self.GBIF_BASE_URL

    @property
    def nasa_power_base_url(self) -> str:
        return self.NASA_POWER_BASE_URL

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