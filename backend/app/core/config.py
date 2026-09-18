import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/darukaa",
    )
    jwt_secret: str = os.getenv("JWT_SECRET", "dev-secret-change-me")
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24
    gbif_base_url: str = "https://api.gbif.org/v1/occurrence/search"
    nasa_power_base_url: str = "https://power.larc.nasa.gov/api/temporal/daily/point"
    cors_origins: list[str] = os.getenv("CORS_ORIGINS", "*").split(",")

    class Config:
        env_file = ".env"


settings = Settings()
