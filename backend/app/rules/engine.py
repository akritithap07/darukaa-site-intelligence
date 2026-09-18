"""
Deterministic, pure rule engine.

Input: normalized evidence records (plain dicts, not ORM objects).
Output: a list of Signal dicts.

No I/O, no randomness, no ML. Every threshold is a named constant so
it can be tuned or made configurable without touching logic.

This module is intentionally free of FastAPI/SQLAlchemy imports so it
can be unit tested in isolation and reused by any future interface
(CLI, batch job, another API).
"""

from __future__ import annotations
from typing import Any

# ---- Configurable thresholds ----
PRECIPITATION_DEVIATION_ATTENTION_PCT = 15.0  # % deviation from baseline that triggers attention
TEMPERATURE_DEVIATION_ATTENTION_C = 2.0  # degrees C deviation that triggers attention
STALE_DATA_DAYS = 30  # evidence older than this (fetched_at) is flagged stale
NEW_SPECIES_INFO_THRESHOLD = 1  # any new distinct species observed triggers an info signal


def _pct_change(baseline: float, current: float) -> float | None:
    if baseline in (None, 0):
        return None
    return ((current - baseline) / baseline) * 100.0


def rule_new_species_observations(evidence: list[dict[str, Any]]) -> list[dict]:
    """Compare distinct species counts between baseline and current GBIF evidence."""
    signals = []
    gbif = [e for e in evidence if e["source"] == "gbif" and e["evidence_type"] == "species_occurrence"]
    baseline = [e for e in gbif if e.get("period_label") == "baseline"]
    current = [e for e in gbif if e.get("period_label") == "current"]

    def species_set(records):
        names = set()
        for r in records:
            payload = r.get("payload") or {}
            sp = payload.get("species")
            if sp:
                names.add(sp)
        return names

    baseline_species = species_set(baseline)
    current_species = species_set(current)
    new_species = current_species - baseline_species

    if len(new_species) >= NEW_SPECIES_INFO_THRESHOLD:
        signals.append({
            "type": "species_occurrence_change",
            "direction": "increase",
            "severity": "info",
            "message": (
                f"{len(new_species)} distinct species observed in the current period "
                f"that were not recorded in the baseline period. This reflects observation "
                f"records only, not a biodiversity health assessment."
            ),
            "evidence_refs": [r["id"] for r in current],
        })
    elif gbif and not current:
        signals.append({
            "type": "species_occurrence_change",
            "direction": "stable",
            "severity": "info",
            "message": "No observations found for this period.",
            "evidence_refs": [],
        })
    return signals


def rule_climate_deviation(evidence: list[dict[str, Any]]) -> list[dict]:
    """Compare NASA POWER climate context between baseline and current."""
    signals = []
    nasa = [e for e in evidence if e["source"] == "nasa_power" and e["evidence_type"] == "climate_daily"]
    baseline = [e for e in nasa if e.get("period_label") == "baseline"]
    current = [e for e in nasa if e.get("period_label") == "current"]

    if not baseline or not current:
        return signals

    def avg(records, key):
        vals = [r["payload"].get(key) for r in records if r["payload"].get(key) is not None]
        return sum(vals) / len(vals) if vals else None

    b_precip = avg(baseline, "precipitation_mm")
    c_precip = avg(current, "precipitation_mm")
    precip_change = _pct_change(b_precip, c_precip) if b_precip is not None and c_precip is not None else None

    if precip_change is not None and abs(precip_change) >= PRECIPITATION_DEVIATION_ATTENTION_PCT:
        direction = "decrease" if precip_change < 0 else "increase"
        signals.append({
            "type": "climate_precipitation_deviation",
            "direction": direction,
            "severity": "attention",
            "message": (
                f"Precipitation is {abs(precip_change):.0f}% {'below' if direction == 'decrease' else 'above'} "
                f"the baseline period. This is a monitoring signal, not a causal biodiversity conclusion."
            ),
            "evidence_refs": [r["id"] for r in current],
        })

    b_temp = avg(baseline, "temperature_c")
    c_temp = avg(current, "temperature_c")
    if b_temp is not None and c_temp is not None:
        temp_delta = c_temp - b_temp
        if abs(temp_delta) >= TEMPERATURE_DEVIATION_ATTENTION_C:
            direction = "increase" if temp_delta > 0 else "decrease"
            signals.append({
                "type": "climate_temperature_deviation",
                "direction": direction,
                "severity": "attention",
                "message": (
                    f"Average temperature is {abs(temp_delta):.1f}\u00b0C "
                    f"{'higher' if direction == 'increase' else 'lower'} than baseline."
                ),
                "evidence_refs": [r["id"] for r in current],
            })

    return signals


def rule_data_freshness(evidence: list[dict[str, Any]], now) -> list[dict]:
    """Flag sources whose most recent fetch is stale."""
    signals = []
    by_source: dict[str, list[dict]] = {}
    for e in evidence:
        by_source.setdefault(e["source"], []).append(e)

    for source, records in by_source.items():
        if source == "synthetic":
            continue
        latest = max(records, key=lambda r: r["fetched_at"])
        age_days = (now - latest["fetched_at"]).days
        if age_days >= STALE_DATA_DAYS:
            signals.append({
                "type": "data_freshness_warning",
                "direction": "stable",
                "severity": "attention",
                "message": f"{source} evidence was last fetched {age_days} days ago and may be stale.",
                "evidence_refs": [latest["id"]],
            })
    return signals


def evaluate(evidence: list[dict[str, Any]], now) -> list[dict]:
    """Run all rules and return the combined, deterministic signal list."""
    signals: list[dict] = []
    signals.extend(rule_new_species_observations(evidence))
    signals.extend(rule_climate_deviation(evidence))
    signals.extend(rule_data_freshness(evidence, now))
    return signals
