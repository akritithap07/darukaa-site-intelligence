from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Boolean,
    DateTime,
    ForeignKey,
    JSON,
    Float,
)
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry

from app.core.db import Base


def utcnow():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    projects = relationship("Project", back_populates="owner", cascade="all, delete-orphan")


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, default="")
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    owner = relationship("User", back_populates="projects")
    sites = relationship("Site", back_populates="project", cascade="all, delete-orphan")


class Site(Base):
    __tablename__ = "sites"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    name = Column(String, nullable=False)
    # Polygon geometry in WGS84 (SRID 4326), spatially indexed by GeoAlchemy2
    geom = Column(Geometry(geometry_type="POLYGON", srid=4326), nullable=True)
    centroid_lat = Column(Float, nullable=True)
    centroid_lon = Column(Float, nullable=True)
    area_hectares = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    project = relationship("Project", back_populates="sites")
    evidence_snapshots = relationship(
        "EvidenceSnapshot", back_populates="site", cascade="all, delete-orphan"
    )


class EvidenceSnapshot(Base):
    """
    Generic, normalized, append-only evidence record.
    Designed so future sources (satellite, bioacoustics, camera traps,
    field observations, sensors) can be added without changing the UI
    or the rule engine's input contract.
    """

    __tablename__ = "evidence_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    site_id = Column(Integer, ForeignKey("sites.id"), nullable=False, index=True)

    source = Column(String, nullable=False)  # e.g. "gbif", "nasa_power", "synthetic"
    source_record_id = Column(String, nullable=True)
    evidence_type = Column(String, nullable=False)  # e.g. "species_occurrence", "climate_daily"
    period_label = Column(String, nullable=True)  # "baseline" | "current" | None

    observed_at = Column(DateTime(timezone=True), nullable=True)
    fetched_at = Column(DateTime(timezone=True), default=utcnow)

    payload = Column(JSON, nullable=False, default=dict)
    is_real = Column(Boolean, default=True)  # False => synthetic/prototype data
    metadata_json = Column(JSON, nullable=True, default=dict)

    site = relationship("Site", back_populates="evidence_snapshots")
