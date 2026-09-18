from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.core.config import settings
from app.core.db import Base, engine, ensure_postgis
from app.routers import auth, evidence, projects, sites

app = FastAPI(
    title="Darukaa Earth — Site Intelligence MVP",
    description="SITE → EVIDENCE → SIGNAL → INSIGHT → ACTION",
    version="0.1.0",
)

# Explicit allowed origins list to prevent CORS credentials wildcard failures
origins = [
    "https://darukaa-site-intelligence.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]

# Add custom origins from settings if configured
for o in settings.cors_origin_list():
    if o and o != "*" and o not in origins:
        origins.append(o)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app|http://localhost:\d+|http://127\.0\.0\.1:\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    try:
        ensure_postgis()
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"Startup DB init warning: {e}")


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