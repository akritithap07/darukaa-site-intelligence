import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
import { getSiteDetail } from "../api/client";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

function ProvenanceBadge({ isReal }) {
  return (
    <span className={`badge ${isReal ? "badge-real" : "badge-synthetic"}`}>
      {isReal ? "Real data" : "Prototype / Synthetic"}
    </span>
  );
}

function SeverityBadge({ severity }) {
  return <span className={`badge badge-${severity}`}>{severity === "attention" ? "Needs Attention" : "Info"}</span>;
}

export default function SiteDetailPage() {
  const { siteId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    getSiteDetail(siteId)
      .then(setData)
      .catch(() => setError("Could not load site detail. The backend or external data sources may be unavailable."))
      .finally(() => setLoading(false));
  }, [siteId]);

  if (loading) return <div className="app-shell loading">Loading site intelligence...</div>;
  if (error) return <div className="app-shell"><div className="error-banner">{error}</div></div>;
  if (!data) return null;

  const { site, evidence, signals, baseline_vs_current: bvc } = data;

  const climateEvidence = evidence
    .filter((e) => e.source === "nasa_power" && e.evidence_type === "climate_daily")
    .sort((a, b) => new Date(a.observed_at) - new Date(b.observed_at));

  const chartData = {
    labels: climateEvidence.map((e) => e.observed_at?.slice(0, 10)),
    datasets: [
      {
        label: "Precipitation (mm)",
        data: climateEvidence.map((e) => e.payload.precipitation_mm),
        borderColor: "#5a9bd4",
        backgroundColor: "transparent",
        tension: 0.3,
      },
      {
        label: "Temperature (°C)",
        data: climateEvidence.map((e) => e.payload.temperature_c),
        borderColor: "#d99a4e",
        backgroundColor: "transparent",
        tension: 0.3,
        yAxisID: "y1",
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    interaction: { mode: "index", intersect: false },
    scales: {
      y: { title: { display: true, text: "mm" } },
      y1: { position: "right", grid: { drawOnChartArea: false }, title: { display: true, text: "°C" } },
    },
    plugins: { legend: { position: "bottom" } },
  };

  const gbifEvidence = evidence
    .filter((e) => e.source === "gbif" && e.evidence_type === "species_occurrence")
    .slice(0, 10);
  const gbifError = evidence.find((e) => e.source === "gbif" && e.evidence_type === "fetch_error");
  const nasaError = evidence.find((e) => e.source === "nasa_power" && e.evidence_type === "fetch_error");

  const attentionSignals = signals.filter((s) => s.severity === "attention");
  const infoSignals = signals.filter((s) => s.severity === "info");

  return (
    <div className="app-shell">
      <Link to={`/projects/${site.project_id}`} className="muted">
        ← Back to project map
      </Link>

      <div className="top-bar" style={{ marginTop: 8 }}>
        <div>
          <div className="brand" style={{ fontSize: 24 }}>{site.name}</div>
          <div className="muted">
            Area: {site.area_hectares ?? "—"} ha · Last updated: {new Date(site.updated_at).toLocaleString()}
          </div>
        </div>
      </div>

      {/* 1. Evidence Summary */}
      <div className="card">
        <h3>Evidence Summary</h3>
        <div className="stat-row"><span>Total evidence records</span><span>{evidence.length}</span></div>
        <div className="stat-row"><span>Real (external) records</span><span>{evidence.filter((e) => e.is_real).length}</span></div>
        <div className="stat-row"><span>Synthetic / prototype records</span><span>{evidence.filter((e) => !e.is_real).length}</span></div>
      </div>

      {/* 2. Baseline vs Current */}
      <div className="card">
        <h3>Baseline vs Current</h3>
        <div className="compare-grid">
          <div className="compare-box">
            <h4>Baseline period</h4>
            <div className="stat-row"><span>Distinct species</span><span>{bvc.baseline.distinct_species}</span></div>
            <div className="stat-row"><span>Avg precipitation</span><span>{bvc.baseline.avg_precipitation_mm ?? "—"} mm</span></div>
            <div className="stat-row"><span>Avg temperature</span><span>{bvc.baseline.avg_temperature_c ?? "—"} °C</span></div>
          </div>
          <div className="compare-box">
            <h4>Current period</h4>
            <div className="stat-row"><span>Distinct species</span><span>{bvc.current.distinct_species}</span></div>
            <div className="stat-row"><span>Avg precipitation</span><span>{bvc.current.avg_precipitation_mm ?? "—"} mm</span></div>
            <div className="stat-row"><span>Avg temperature</span><span>{bvc.current.avg_temperature_c ?? "—"} °C</span></div>
          </div>
        </div>
      </div>

      {/* 3. Chart.js time series */}
      <div className="card">
        <h3>Climate Time Series</h3>
        {climateEvidence.length > 0 ? (
          <Line data={chartData} options={chartOptions} />
        ) : (
          <div className="muted">No observations found for this period.</div>
        )}
      </div>

      {/* 4. Live GBIF evidence */}
      <div className="card">
        <h3>Live GBIF Evidence</h3>
        {gbifError && (
          <div className="error-banner">
            GBIF fetch failed: {gbifError.payload.error}. Showing no fallback fabricated data — this is an honest empty state.
          </div>
        )}
        {gbifEvidence.length === 0 && !gbifError && <div className="muted">No observations found for this period.</div>}
        {gbifEvidence.map((e) => (
          <div key={e.id} className="signal-row">
            <ProvenanceBadge isReal={e.is_real} />
            <div>
              <div style={{ fontWeight: 500 }}>{e.payload.species}</div>
              <div className="muted">
                Source: GBIF · Fetched {new Date(e.fetched_at).toLocaleDateString()}
                {e.observed_at ? ` · Observed ${new Date(e.observed_at).toLocaleDateString()}` : ""}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 5. NASA climate context */}
      <div className="card">
        <h3>NASA POWER Climate Context</h3>
        {nasaError && (
          <div className="error-banner">NASA POWER fetch failed: {nasaError.payload.error}.</div>
        )}
        <div className="muted">
          Climate context only — temperature and precipitation from NASA POWER. Not combined with biodiversity data to imply causation.
        </div>
      </div>

      {/* 6 & 7. What Changed / Needs Attention */}
      <div className="card">
        <h3>What Changed</h3>
        {infoSignals.length === 0 && <div className="muted">No notable changes detected.</div>}
        {infoSignals.map((s, i) => (
          <div key={i} className="signal-row">
            <SeverityBadge severity={s.severity} />
            <div>{s.message}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3>Needs Attention</h3>
        {attentionSignals.length === 0 && <div className="muted">No attention signals for this period.</div>}
        {attentionSignals.map((s, i) => (
          <div key={i} className="signal-row">
            <SeverityBadge severity={s.severity} />
            <div>
              {s.message}
              <div className="muted" style={{ marginTop: 4 }}>
                This is a monitoring signal, not a causal biodiversity conclusion.
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 8. Evidence provenance */}
      <div className="card">
        <h3>Evidence Provenance</h3>
        {evidence.slice(0, 15).map((e) => (
          <div key={e.id} className="signal-row">
            <ProvenanceBadge isReal={e.is_real} />
            <div className="muted">
              {e.source} · {e.evidence_type} · {e.period_label || "unlabeled"} · fetched {new Date(e.fetched_at).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
