import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSiteDetail, extractErrorMessage } from '../api/client';
import AppNavbar from '../components/AppNavbar';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import {
  ShieldCheck,
  AlertTriangle,
  Database,
  Sun,
  Bug,
  Activity,
  ArrowLeft,
  Calendar,
  Compass,
  FileText,
  TrendingUp,
  Clock,
  MapPin
} from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function SiteDetailPage() {
  const { siteId } = useParams();
  const navigate = useNavigate();

  const [siteData, setSiteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadSiteDetails() {
      try {
        setError('');
        const data = await getSiteDetail(siteId);
        setSiteData(data);
      } catch (err) {
        setError(extractErrorMessage(err, 'Failed to load site intelligence data.'));
      } finally {
        setLoading(false);
      }
    }
    loadSiteDetails();
  }, [siteId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 text-xs font-medium">
        Loading site intelligence & evidence provenance...
      </div>
    );
  }

  if (error || !siteData) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
        <AppNavbar />
        <div className="p-8 max-w-4xl mx-auto w-full space-y-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-slate-400 hover:text-white text-xs flex items-center space-x-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </button>
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-4 rounded-lg text-xs">
            {error || 'Site not found.'}
          </div>
        </div>
      </div>
    );
  }

  const { site = {}, evidence = [], signals = [], baseline_vs_current = {} } = siteData;

  const infoSignals = signals.filter((s) => s.severity === 'info' || s.severity === 'low');
  const attentionSignals = signals.filter((s) => s.severity === 'attention' || s.severity === 'warning' || s.severity === 'critical');

  const nasaRecords = evidence.filter(
    (e) => (e.source === 'nasa_power' || e.source === 'NASA POWER') && e.evidence_type !== 'fetch_error'
  );

  // Prepare Climate Chart Data
  const chartLabels = nasaRecords.map((r) =>
    r.observed_at ? new Date(r.observed_at).toLocaleDateString() : 'Observed'
  );

  const climateChartData = {
    labels: chartLabels.length > 0 ? chartLabels : ['No Data'],
    datasets: [
      {
        label: 'Temperature (°C)',
        data: nasaRecords.map((r) => r.payload?.temperature_c ?? null),
        borderColor: '#F59E0B',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        tension: 0.3,
        pointRadius: 3,
      },
      {
        label: 'Precipitation (mm)',
        data: nasaRecords.map((r) => r.payload?.precipitation_mm ?? null),
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.3,
        pointRadius: 3,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#94A3B8', font: { size: 11 } } },
      tooltip: { backgroundColor: '#0F172A', titleColor: '#F8FAFC', bodyColor: '#CBD5E1' },
    },
    scales: {
      x: { ticks: { color: '#64748B', font: { size: 10 } }, grid: { color: '#334155' } },
      y: { ticks: { color: '#64748B', font: { size: 10 } }, grid: { color: '#334155' } },
    },
  };

  const baseline = baseline_vs_current.baseline || {};
  const current = baseline_vs_current.current || {};

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col pb-12">
      <AppNavbar site={site} />

      <main className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Navigation & Header Banner */}
        <div className="space-y-4">
          <button
            onClick={() => navigate(`/projects/${site.project_id}`)}
            className="text-slate-400 hover:text-white text-xs flex items-center space-x-1.5 transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Project Workspace</span>
          </button>

          <div className="bg-slate-800 border border-slate-700/80 p-6 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
            <div>
              <div className="flex items-center space-x-2 text-xs text-slate-400 mb-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>Site #{site.id} • PostGIS Geometry Active</span>
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">{site.name}</h1>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-2">
                <span className="flex items-center space-x-1">
                  <Compass className="w-3.5 h-3.5 text-slate-500" />
                  <span>Centroid: {site.centroid_lat?.toFixed(4)}, {site.centroid_lon?.toFixed(4)}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>Area: {site.area_hectares || 'N/A'} ha</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>Updated: {site.updated_at ? new Date(site.updated_at).toLocaleDateString() : 'Recent'}</span>
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <span className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-lg font-semibold flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Deterministic Rule Engine Active</span>
              </span>
            </div>
          </div>
        </div>

        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-800/80 border border-slate-700/80 p-5 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Species Observed</span>
              <Bug className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {current.distinct_species ?? 0} <span className="text-xs font-normal text-slate-400">distinct</span>
            </div>
            <p className="text-[11px] text-slate-400">
              {baseline.distinct_species !== undefined
                ? `Baseline period: ${baseline.distinct_species} species`
                : 'Observed during current period'}
            </p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 p-5 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Climate Context</span>
              <Sun className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {current.avg_precipitation_mm !== null && current.avg_precipitation_mm !== undefined
                ? `${current.avg_precipitation_mm} mm/day`
                : 'N/A'}
            </div>
            <p className="text-[11px] text-slate-400">
              Avg Temp: {current.avg_temperature_c !== null && current.avg_temperature_c !== undefined ? `${current.avg_temperature_c} °C` : 'N/A'}
            </p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 p-5 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Evidence Status</span>
              <Clock className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-sm font-bold text-emerald-400">
              {attentionSignals.length > 0 ? 'Attention Required' : 'Fresh & Active'}
            </div>
            <p className="text-[11px] text-slate-400">
              {evidence.length} total evidence snapshots logged
            </p>
          </div>
        </div>

        {/* Deterministic Signals: What Changed & Needs Attention */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* WHAT CHANGED */}
          <div className="bg-slate-800 border border-slate-700/80 p-5 rounded-xl space-y-4 shadow-lg">
            <div className="flex items-center space-x-2 text-emerald-400 border-b border-slate-700/60 pb-3">
              <Activity className="w-4 h-4" />
              <h2 className="font-semibold text-sm text-slate-100">What Changed</h2>
            </div>
            {infoSignals.length > 0 ? (
              <div className="space-y-2">
                {infoSignals.map((sig, idx) => (
                  <div key={idx} className="text-xs text-slate-200 bg-slate-900/60 p-3 rounded-lg border border-slate-700/50 flex items-start space-x-2">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                    <span>{sig.message}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-400 bg-slate-900/40 p-4 rounded-lg border border-slate-800 italic">
                No significant observational changes detected relative to reference baseline.
              </div>
            )}
          </div>

          {/* NEEDS ATTENTION */}
          <div className="bg-slate-800 border border-slate-700/80 p-5 rounded-xl space-y-4 shadow-lg">
            <div className="flex items-center space-x-2 text-amber-400 border-b border-slate-700/60 pb-3">
              <AlertTriangle className="w-4 h-4" />
              <h2 className="font-semibold text-sm text-slate-100">Needs Attention</h2>
            </div>
            {attentionSignals.length > 0 ? (
              <div className="space-y-2">
                {attentionSignals.map((sig, idx) => (
                  <div key={idx} className="text-xs text-amber-200/90 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20 flex items-start space-x-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                    <span>{sig.message}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-400 bg-slate-900/40 p-4 rounded-lg border border-slate-800 italic">
                All evidence parameters remain within standard threshold parameters.
              </div>
            )}
          </div>
        </div>

        {/* BASELINE VS CURRENT COMPARISON */}
        <div className="bg-slate-800 border border-slate-700/80 p-6 rounded-xl space-y-4 shadow-lg">
          <h2 className="font-semibold text-sm text-slate-100 flex items-center space-x-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>Baseline vs Current Period Comparison</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Baseline Column */}
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/60 space-y-3">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">
                Baseline Window (Reference)
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Distinct Species:</span>
                  <span className="font-semibold text-white">{baseline.distinct_species ?? 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Avg Precipitation:</span>
                  <span className="font-semibold text-white">{baseline.avg_precipitation_mm !== null && baseline.avg_precipitation_mm !== undefined ? `${baseline.avg_precipitation_mm} mm/day` : 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Avg Temperature:</span>
                  <span className="font-semibold text-white">{baseline.avg_temperature_c !== null && baseline.avg_temperature_c !== undefined ? `${baseline.avg_temperature_c} °C` : 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Logged Snapshots:</span>
                  <span className="font-semibold text-white">{baseline.record_count ?? 0}</span>
                </div>
              </div>
            </div>

            {/* Current Column */}
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/60 space-y-3">
              <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider border-b border-slate-800 pb-2">
                Current Monitoring Window
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Distinct Species:</span>
                  <span className="font-semibold text-emerald-400">{current.distinct_species ?? 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Avg Precipitation:</span>
                  <span className="font-semibold text-white">{current.avg_precipitation_mm !== null && current.avg_precipitation_mm !== undefined ? `${current.avg_precipitation_mm} mm/day` : 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Avg Temperature:</span>
                  <span className="font-semibold text-white">{current.avg_temperature_c !== null && current.avg_temperature_c !== undefined ? `${current.avg_temperature_c} °C` : 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Logged Snapshots:</span>
                  <span className="font-semibold text-white">{current.record_count ?? 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Climate Visualization Chart */}
        <div className="bg-slate-800 border border-slate-700/80 p-6 rounded-xl space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
            <h2 className="font-semibold text-sm text-slate-100 flex items-center space-x-2">
              <Sun className="w-4 h-4 text-amber-400" />
              <span>NASA POWER Meteorological Time-Series</span>
            </h2>
            <span className="text-[10px] text-slate-400 bg-slate-900 px-2.5 py-1 rounded-full border border-slate-700 font-medium">
              Daily Climate Observations
            </span>
          </div>

          {nasaRecords.length > 0 ? (
            <div className="h-72 w-full pt-2">
              <Line data={climateChartData} options={chartOptions} />
            </div>
          ) : (
            <div className="text-center py-12 text-xs text-slate-500">
              No climate time-series observations logged for this site location window.
            </div>
          )}
        </div>

        {/* Provenance & Evidence Audit Records */}
        <div className="bg-slate-800 border border-slate-700/80 p-6 rounded-xl space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
            <h2 className="font-semibold text-sm text-slate-100 flex items-center space-x-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>Evidence Audit & Provenance Records ({evidence.length})</span>
            </h2>
          </div>

          {evidence.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-500">No evidence snapshots logged for this site.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {evidence.map((item) => {
                const isReal = item.is_real !== false;
                const isError = item.evidence_type === 'fetch_error';
                return (
                  <div key={item.id} className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-slate-200 flex items-center space-x-2">
                        {item.source?.toLowerCase().includes('gbif') ? (
                          <Bug className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Sun className="w-4 h-4 text-amber-400" />
                        )}
                        <span className="uppercase tracking-wider">{item.source}</span>
                      </span>

                      <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${
                        isError
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : isReal
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                      }`}>
                        {isError ? 'FETCH ERROR' : isReal ? 'LIVE DATA' : 'PROTOTYPE / SYNTHETIC'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-300 space-y-1">
                      <div>
                        <span className="text-slate-500">Evidence Type: </span>
                        <span className="font-mono text-slate-200">{item.evidence_type}</span>
                      </div>
                      {item.payload?.species && (
                        <div>
                          <span className="text-slate-500">Species: </span>
                          <span className="font-medium text-emerald-300 italic">{item.payload.species}</span>
                        </div>
                      )}
                      {item.payload?.temperature_c !== undefined && (
                        <div>
                          <span className="text-slate-500">Observed Temp: </span>
                          <span className="font-medium text-amber-300">{item.payload.temperature_c} °C</span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                      <div>Observed: {item.observed_at ? new Date(item.observed_at).toLocaleDateString() : 'N/A'}</div>
                      <div>Fetched: {item.fetched_at ? new Date(item.fetched_at).toLocaleDateString() : 'N/A'}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}