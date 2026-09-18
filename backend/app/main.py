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
    redirect_slashes=False,
)

# Custom CORS Middleware to guarantee CORS headers are attached on ALL responses (including 500 errors & OPTIONS preflights)
@app.middleware("http")
async def cors_fallback_middleware(request: Request, call_next):
    origin = request.headers.get("origin", "")
    
    # Handle preflight OPTIONS request explicitly
    if request.method == "OPTIONS":
        response = JSONResponse(content={"status": "ok"})
        response.headers["Access-Control-Allow-Origin"] = origin if origin else "*"
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "*"
        return response

    try:
        response = await call_next(request)
    except Exception as exc:
        response = JSONResponse(
            status_code=500,
            content={"detail": f"Internal Server Error: {str(exc)}"},
        )

    if origin:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "*"

    return response


# Standard CORSMiddleware
origins = [
    "https://darukaa-site-intelligence.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]

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