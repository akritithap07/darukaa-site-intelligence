from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.config import settings
from app.core.db import Base, engine, ensure_postgis
from app.routers import auth, evidence, projects, sites

app = FastAPI(
    title="Darukaa Earth — Site Intelligence MVP",
    description="SITE → EVIDENCE → SIGNAL → INSIGHT → ACTION",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://darukaa-site-intelligence.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    ensure_postgis()
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def health():
    postgis_version = None
    try:
        with engine.connect() as conn:
            postgis_version = conn.execute(text("SELECT PostGIS_Version()")).scalar()
    except Exception:
        postgis_version = None
    return {"status": "ok", "postgis": postgis_version}


app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(sites.router)
app.include_router(evidence.router)