from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.db import Base, engine
from app.core.config import settings
from app.routers import auth, projects, sites, evidence

app = FastAPI(
    title="Darukaa Earth — Site Intelligence MVP",
    description="SITE → EVIDENCE → SIGNAL → INSIGHT → ACTION",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(sites.router)
app.include_router(evidence.router)
