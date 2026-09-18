from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

from app.core.config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def ensure_postgis() -> None:
    """Enable PostGIS before GeoAlchemy geometry tables are created.

    Render Postgres supports the extension but does not enable it by default.
    CREATE EXTENSION must run before `Base.metadata.create_all()`.
    """
    try:
        with engine.begin() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
    except Exception:
        # Extension may already exist under a different owner; verify it is usable.
        with engine.connect() as conn:
            conn.execute(text("SELECT PostGIS_Version()")).scalar()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()