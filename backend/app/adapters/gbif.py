"""
GBIF occurrence adapter.

Fetches species occurrence records for a bounding box and normalizes
them into the generic evidence-snapshot payload shape. Scientifically
scoped: this adapter only ever produces "species observed" facts. It
never computes or implies a biodiversity health/score value.
"""
from __future__ import annotations
from datetime import datetime, timezone
from typing import Any

import httpx

from app.core.config import settings

GBIF_TIMEOUT = 8.0


def fetch_occurrences(min_lat: float, min_lon: float, max_lat: float, max_lon: float, limit: int = 50) -> dict[str, Any]:
    """
    Calls the official GBIF occurrence search API for a bounding box.
    Returns a dict with 'ok', 'records' (normalized), and 'raw_count'.
    Never raises on network/API failure — returns ok=False instead, so
    callers can fall back gracefully without pretending the call worked.
    """
    params = {
        "decimalLatitude": f"{min_lat},{max_lat}",
        "decimalLongitude": f"{min_lon},{max_lon}",
        "hasCoordinate": "true",
        "limit": limit,
    }
    try:
        resp = httpx.get(settings.gbif_base_url, params=params, timeout=GBIF_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
    except Exception as exc:  # network error, timeout, bad response
        return {"ok": False, "error": str(exc), "records": [], "raw_count": 0}

    results = data.get("results", [])
    records = []
    for r in results:
        species = r.get("species") or r.get("scientificName")
        if not species:
            continue
        records.append({
            "source_record_id": str(r.get("key")),
            "species": species,
            "scientific_name": r.get("scientificName"),
            "observed_at": r.get("eventDate"),
            "basis_of_record": r.get("basisOfRecord"),
            "decimal_latitude": r.get("decimalLatitude"),
            "decimal_longitude": r.get("decimalLongitude"),
            "dataset_key": r.get("datasetKey"),
        })

    return {"ok": True, "records": records, "raw_count": data.get("count", len(records))}
