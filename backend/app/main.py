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

# Robust CORS Configuration supporting Vercel production, preview deployments, and local dev
cors_origins = set(settings.cors_origin_list())
cors_origins.update([
    "https://darukaa-site-intelligence.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
])

# Remove raw '*' string from allow_origins list if allow_credentials=True is enabled to prevent browser CORS rejections
allow_all = "*" in cors_origins
if allow_all:
    cors_origins.remove("*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(cors_origins) if not allow_all else ["*"],
    allow_origin_regex=r"https://.*\.vercel\.app" if allow_all else None,
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