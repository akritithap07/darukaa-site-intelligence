import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from geoalchemy2.shape import from_shape, to_shape
from shapely.geometry import Polygon

from app.core.db import get_db
from app.core.security import get_current_user
from app.models.models import Site, Project, User
from app.models.schemas import SiteCreate, SiteOut

router = APIRouter(prefix="/sites", tags=["sites"])


def _area_hectares(poly: Polygon) -> float:
    """
    Rough planar-approximation area in hectares. Good enough for a
    prototype demo at typical site scale; a production system would
    reproject to an equal-area CRS before computing area.
    """
    # crude degrees->meters approximation at mid-latitudes; documented limitation
    lat = poly.centroid.y
    meters_per_deg_lat = 111320
    meters_per_deg_lon = 111320 * abs(__import__("math").cos(__import__("math").radians(lat)))
    area_deg2 = poly.area
    area_m2 = area_deg2 * meters_per_deg_lat * meters_per_deg_lon
    return round(area_m2 / 10000, 2)


def _site_to_out(site: Site) -> SiteOut:
    shp = to_shape(site.geom) if site.geom is not None else None
    geojson = json.loads(json.dumps(shp.__geo_interface__)) if shp else {}
    return SiteOut(
        id=site.id,
        project_id=site.project_id,
        name=site.name,
        polygon_geojson=geojson,
        centroid_lat=site.centroid_lat,
        centroid_lon=site.centroid_lon,
        area_hectares=site.area_hectares,
        updated_at=site.updated_at,
    )


@router.post("", response_model=SiteOut, status_code=201)
def create_site(payload: SiteCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == payload.project_id, Project.owner_id == user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    poly = Polygon(payload.polygon[0])
    if not poly.is_valid:
        raise HTTPException(status_code=400, detail="Invalid polygon geometry")

    centroid = poly.centroid
    site = Site(
        project_id=payload.project_id,
        name=payload.name,
        geom=from_shape(poly, srid=4326),
        centroid_lat=centroid.y,
        centroid_lon=centroid.x,
        area_hectares=_area_hectares(poly),
    )
    db.add(site)
    db.commit()
    db.refresh(site)
    return _site_to_out(site)


@router.get("/by-project/{project_id}", response_model=list[SiteOut])
def list_sites(project_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == project_id, Project.owner_id == user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    sites = db.query(Site).filter(Site.project_id == project_id).all()
    return [_site_to_out(s) for s in sites]


@router.get("/{site_id}", response_model=SiteOut)
def get_site(site_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    site = (
        db.query(Site)
        .join(Project, Site.project_id == Project.id)
        .filter(Site.id == site_id, Project.owner_id == user.id)
        .first()
    )
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    return _site_to_out(site)
