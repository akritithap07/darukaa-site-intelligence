"""
NASA POWER climate adapter.

Fetches daily temperature/precipitation for a point (site centroid)
over a date range and normalizes into evidence-snapshot payloads.
Climate context only — never combined with biodiversity data to
imply causation inside this module.
"""
from __future__ import annotations
from datetime import datetime
from typing import Any

import httpx

from app.core.config import settings

NASA_TIMEOUT = 8.0
PARAMETERS = "T2M,PRECTOTCORR"  # temperature at 2m, corrected precipitation


def fetch_climate(lat: float, lon: float, start: str, end: str) -> dict[str, Any]:
    """
    start/end format: YYYYMMDD (NASA POWER daily API requirement).
    Returns ok=False on any failure rather than raising, so the caller
    can show an honest fallback state instead of pretending success.
    """
    params = {
        "parameters": PARAMETERS,
        "community": "AG",
        "longitude": lon,
        "latitude": lat,
        "start": start,
        "end": end,
        "format": "JSON",
    }
    try:
        resp = httpx.get(settings.nasa_power_base_url, params=params, timeout=NASA_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
    except Exception as exc:
        return {"ok": False, "error": str(exc), "records": []}

    try:
        param_data = data["properties"]["parameter"]
        temp_series = param_data.get("T2M", {})
        precip_series = param_data.get("PRECTOTCORR", {})
    except (KeyError, TypeError) as exc:
        return {"ok": False, "error": f"unexpected response shape: {exc}", "records": []}

    records = []
    for date_str in temp_series.keys():
        temp = temp_series.get(date_str)
        precip = precip_series.get(date_str)
        # NASA POWER uses -999 as a fill value for missing data
        if temp == -999 or precip == -999:
            continue
        records.append({
            "date": date_str,
            "temperature_c": temp,
            "precipitation_mm": precip,
        })

    return {"ok": True, "records": records}
