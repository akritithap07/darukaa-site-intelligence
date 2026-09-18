from datetime import datetime, timedelta, timezone

from app.rules.engine import (
    evaluate,
    rule_new_species_observations,
    rule_climate_deviation,
    rule_data_freshness,
)

NOW = datetime(2026, 9, 18, tzinfo=timezone.utc)


def make_evidence(**kwargs):
    base = {
        "id": 1,
        "source": "gbif",
        "evidence_type": "species_occurrence",
        "period_label": "baseline",
        "fetched_at": NOW - timedelta(days=1),
        "payload": {},
    }
    base.update(kwargs)
    return base


def test_new_species_triggers_info_signal():
    evidence = [
        make_evidence(id=1, period_label="baseline", payload={"species": "Panthera tigris"}),
        make_evidence(id=2, period_label="current", payload={"species": "Panthera tigris"}),
        make_evidence(id=3, period_label="current", payload={"species": "Elephas maximus"}),
    ]
    signals = rule_new_species_observations(evidence)
    assert len(signals) == 1
    assert signals[0]["severity"] == "info"
    assert "1 distinct species" in signals[0]["message"]


def test_no_observations_message_is_not_zero():
    evidence = [
        make_evidence(id=1, period_label="baseline", payload={"species": "Panthera tigris"}),
    ]
    signals = rule_new_species_observations(evidence)
    assert signals[0]["message"] == "No observations found for this period."


def test_climate_precipitation_deviation_triggers_attention():
    evidence = [
        make_evidence(id=10, source="nasa_power", evidence_type="climate_daily",
                      period_label="baseline", payload={"precipitation_mm": 100, "temperature_c": 25}),
        make_evidence(id=11, source="nasa_power", evidence_type="climate_daily",
                      period_label="current", payload={"precipitation_mm": 70, "temperature_c": 25}),
    ]
    signals = rule_climate_deviation(evidence)
    assert any(s["type"] == "climate_precipitation_deviation" for s in signals)
    sig = [s for s in signals if s["type"] == "climate_precipitation_deviation"][0]
    assert sig["direction"] == "decrease"
    assert sig["severity"] == "attention"


def test_climate_no_signal_when_within_threshold():
    evidence = [
        make_evidence(id=10, source="nasa_power", evidence_type="climate_daily",
                      period_label="baseline", payload={"precipitation_mm": 100, "temperature_c": 25}),
        make_evidence(id=11, source="nasa_power", evidence_type="climate_daily",
                      period_label="current", payload={"precipitation_mm": 98, "temperature_c": 25.5}),
    ]
    signals = rule_climate_deviation(evidence)
    assert signals == []


def test_stale_data_flagged():
    evidence = [
        make_evidence(id=1, source="gbif", fetched_at=NOW - timedelta(days=45)),
    ]
    signals = rule_data_freshness(evidence, NOW)
    assert len(signals) == 1
    assert signals[0]["type"] == "data_freshness_warning"


def test_synthetic_source_never_flagged_stale():
    evidence = [
        make_evidence(id=1, source="synthetic", fetched_at=NOW - timedelta(days=999)),
    ]
    signals = rule_data_freshness(evidence, NOW)
    assert signals == []


def test_evaluate_combines_all_rules():
    evidence = [
        make_evidence(id=1, source="gbif", period_label="baseline", payload={"species": "A"}, fetched_at=NOW),
        make_evidence(id=2, source="gbif", period_label="current", payload={"species": "B"}, fetched_at=NOW),
    ]
    signals = evaluate(evidence, NOW)
    assert isinstance(signals, list)
    assert any(s["type"] == "species_occurrence_change" for s in signals)
