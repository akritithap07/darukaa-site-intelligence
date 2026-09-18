from typing import Any

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql://postgres:postgres@localhost:5432/darukaa"
    jwt_secret: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24
    gbif_base_url: str = "https://api.gbif.org/v1/occurrence/search"
    nasa_power_base_url: str = "https://power.larc.nasa.gov/api/temporal/daily/point"
    # Keep this a string so pydantic-settings does not JSON-decode the env var.
    cors_origins: str = "*"

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_db_url(cls, v: Any) -> str:
        url = str(v)
        # Render / Heroku still emit postgres://; SQLAlchemy 2 requires postgresql://
        if url.startswith("postgres://"):
            url = "postgresql://" + url[len("postgres://") :]
        return url

    def cors_origin_list(self) -> list[str]:
        text = (self.cors_origins or "*").strip()
        if text.startswith("["):
            import json

            parsed = json.loads(text)
            return [str(item).strip() for item in parsed if str(item).strip()]
        return [part.strip() for part in text.split(",") if part.strip()]


settings = Settings()