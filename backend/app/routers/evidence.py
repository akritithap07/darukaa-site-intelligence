from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_current_user
from app.models.models import Site, Project, EvidenceSnapshot, User
from app.models.schemas import SiteDetailOut, EvidenceOut, Signal
from app.adapters import gbif, nasa_power
from app.rules.engine import evaluate
from app.routers.sites import _site_to_out

router = APIRouter(prefix="/sites", tags=["evidence"])

CACHE_TTL_HOURS = 6  # do not re-hit external APIs more often than this
BASELINE_DAYS_AGO = (60, 30)  # (start_days_ago, end_days_ago) for baseline window
CURRENT_DAYS_AGO = (30, 0)  # for current window


def _ensure_utc_aware(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _get_owned_site(site_id: int, db: Session, user: User) -> Site:
    site = (
        db.query(Site)
        .join(Project, Site.project_id == Project.id)
        .filter(Site.id == site_id, Project.owner_id == user.id)
        .first()
    )
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    return site


def _cache_fresh(source: str, site_id: int, db: Session) -> bool:
    latest = (
        db.query(EvidenceSnapshot)
        .filter(EvidenceSnapshot.site_id == site_id, EvidenceSnapshot.source == source)
        .order_by(EvidenceSnapshot.fetched_at.desc())
        .first()
    )
    if not latest or not latest.fetched_at:
        return False
    fetched_at = _ensure_utc_aware(latest.fetched_at)
    now = datetime.now(timezone.utc)
    age = now - fetched_at
    return age < timedelta(hours=CACHE_TTL_HOURS)


def _ensure_gbif_evidence(site: Site, db: Session):
    if _cache_fresh("gbif", site.id, db):
        return
    if site.geom is None or site.centroid_lat is None:
        return
    delta = 0.2
    result = gbif.fetch_occurrences(
        min_lat=site.centroid_lat - delta,
        min_lon=site.centroid_lon - delta,
        max_lat=site.centroid_lat + delta,
        max_lon=site.centroid_lon + delta,
    )
    if not result["ok"]:
        snap = EvidenceSnapshot(
            site_id=site.id,
            source="gbif",
            evidence_type="fetch_error",
            period_label=None,
            is_real=False,
            payload={"error": result.get("error", "unknown error")},
            metadata_json={"fallback": True},
        )
        db.add(snap)
        db.commit()
        return

    now = datetime.now(timezone.utc)
    for record in result["records"]:
        observed_at = None
        if record.get("observed_at"):
            try:
                observed_at = _ensure_utc_aware(datetime.fromisoformat(record["observed_at"].replace("Z", "+00:00")))
            except Exception:
                observed_at = None
        period = "current"
        if observed_at and (now - observed_at).days > CURRENT_DAYS_AGO[1] + 365:
            period = "baseline"
        snap = EvidenceSnapshot(
            site_id=site.id,
            source="gbif",
            source_record_id=record.get("source_record_id"),
            evidence_type="species_occurrence",
            period_label=period,
            observed_at=observed_at,
            is_real=True,
            payload={
                "species": record.get("species"),
                "scientific_name": record.get("scientific_name"),
                "basis_of_record": record.get("basis_of_record"),
            },
            metadata_json={"dataset_key": record.get("dataset_key")},
        )
        db.add(snap)
    db.commit()


def _ensure_nasa_evidence(site: Site, db: Session):
    if _cache_fresh("nasa_power", site.id, db):
        return
    if site.centroid_lat is None or site.centroid_lon is None:
        return

    now = datetime.now(timezone.utc)

    def window(start_days_ago, end_days_ago):
        start = (now - timedelta(days=start_days_ago)).strftime("%Y%m%d")
        end = (now - timedelta(days=end_days_ago)).strftime("%Y%m%d")
        return start, end

    windows = {"baseline": window(*BASELINE_DAYS_AGO), "current": window(*CURRENT_DAYS_AGO)}

    for period, (start, end) in windows.items():
        result = nasa_power.fetch_climate(site.centroid_lat, site.centroid_lon, start, end)
        if not result["ok"]:
            snap = EvidenceSnapshot(
                site_id=site.id,
                source="nasa_power",
                evidence_type="fetch_error",
                period_label=period,
                is_real=False,
                payload={"error": result.get("error", "unknown error")},
                metadata_json={"fallback": True},
            )
            db.add(snap)
            continue
        for record in result["records"]:
            snap = EvidenceSnapshot(
                site_id=site.id,
                source="nasa_power",
                evidence_type="climate_daily",
                period_label=period,
                observed_at=datetime.strptime(record["date"], "%Y%m%d").replace(tzinfo=timezone.utc),
                is_real=True,
                payload={
                    "temperature_c": record.get("temperature_c"),
                    "precipitation_mm": record.get("precipitation_mm"),
                },
            )
            db.add(snap)
    db.commit()


def _build_baseline_vs_current(evidence: list[EvidenceSnapshot]) -> dict:
    def summarize(period):
        subset = [e for e in evidence if e.period_label == period]
        species = {e.payload.get("species") for e in subset if e.source == "gbif" and e.payload.get("species")}
        precip_vals = [e.payload.get("precipitation_mm") for e in subset if e.source == "nasa_power" and e.payload.get("precipitation_mm") is not None]
        temp_vals = [e.payload.get("temperature_c") for e in subset if e.source == "nasa_power" and e.payload.get("temperature_c") is not None]
        return {
            "distinct_species": len(species),
            "avg_precipitation_mm": round(sum(precip_vals) / len(precip_vals), 2) if precip_vals else None,
            "avg_temperature_c": round(sum(temp_vals) / len(temp_vals), 2) if temp_vals else None,
            "record_count": len(subset),
        }

    return {"baseline": summarize("baseline"), "current": summarize("current")}


@router.get("/{site_id}/detail", response_model=SiteDetailOut)
def get_site_detail(site_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    site = _get_owned_site(site_id, db, user)

    _ensure_gbif_evidence(site, db)
    _ensure_nasa_evidence(site, db)

    evidence_rows = (
        db.query(EvidenceSnapshot)
        .filter(EvidenceSnapshot.site_id == site_id)
        .order_by(EvidenceSnapshot.fetched_at.desc())
        .all()
    )

    evidence_dicts = [
        {
            "id": e.id,
            "source": e.source,
            "evidence_type": e.evidence_type,
            "period_label": e.period_label,
            "fetched_at": _ensure_utc_aware(e.fetched_at),
            "payload": e.payload or {},
        }
        for e in evidence_rows
    ]

    signals_raw = evaluate(evidence_dicts, datetime.now(timezone.utc))
    signals = [Signal(**s) for s in signals_raw]

    baseline_vs_current = _build_baseline_vs_current(evidence_rows)

    return SiteDetailOut(
        site=_site_to_out(site),
        evidence=[EvidenceOut.model_validate(e) for e in evidence_rows],
        signals=signals,
        baseline_vs_current=baseline_vs_current,
    )
