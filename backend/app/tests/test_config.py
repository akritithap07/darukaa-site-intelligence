
from app.core.config import Settings


def test_postgres_scheme_normalized(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgres://user:pass@host/db")
    settings = Settings()
    assert settings.database_url == "postgresql://user:pass@host/db"


def test_cors_json_wildcard(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", '["*"]')
    settings = Settings()
    assert settings.cors_origin_list() == ["*"]


def test_cors_star_string(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", "*")
    settings = Settings()
    assert settings.cors_origin_list() == ["*"]


def test_cors_comma_separated(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", "https://a.example,https://b.example")
    settings = Settings()
    assert settings.cors_origin_list() == ["https://a.example", "https://b.example"]