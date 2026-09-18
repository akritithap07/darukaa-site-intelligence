from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, EmailStr, field_validator


# ---------- Auth ----------

class UserCreate(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: str

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ---------- Projects ----------

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = ""


class ProjectOut(BaseModel):
    id: int
    name: str
    description: str
    site_count: int = 0

    class Config:
        from_attributes = True


# ---------- Sites ----------

class SiteCreate(BaseModel):
    project_id: int
    name: str
    # GeoJSON Polygon coordinates: [[[lon, lat], [lon, lat], ...]]
    polygon: list[list[list[float]]]

    @field_validator("polygon")
    @classmethod
    def validate_ring(cls, v):
        if not v or len(v[0]) < 4:
            raise ValueError("Polygon must have at least 4 coordinate pairs (closed ring)")
        return v


class SiteOut(BaseModel):
    id: int
    project_id: int
    name: str
    polygon_geojson: dict
    centroid_lat: Optional[float]
    centroid_lon: Optional[float]
    area_hectares: Optional[float]
    updated_at: datetime

    class Config:
        from_attributes = True


# ---------- Evidence ----------

class EvidenceOut(BaseModel):
    id: int
    source: str
    source_record_id: Optional[str]
    evidence_type: str
    period_label: Optional[str]
    observed_at: Optional[datetime]
    fetched_at: datetime
    payload: Any
    is_real: bool
    metadata_json: Optional[dict]

    class Config:
        from_attributes = True


class Signal(BaseModel):
    type: str
    direction: str  # increase | decrease | stable
    severity: str  # info | attention
    message: str
    evidence_refs: list[int] = []


class SiteDetailOut(BaseModel):
    site: SiteOut
    evidence: list[EvidenceOut]
    signals: list[Signal]
    baseline_vs_current: dict
