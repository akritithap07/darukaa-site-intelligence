import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { sitesApi } from '../api/client';
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
import { ShieldCheck, AlertTriangle, Database, Sun, Bug, Activity } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function SiteDetailPage() {
  const { siteId } = useParams();
  const [siteData, setSiteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadSiteDetails() {
      try {
        const res = await sitesApi.getDetail(siteId);
        setSiteData(res.data);
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load site intelligence data.');
      } finally {
        setLoading(false);
      }
    }
    loadSiteDetails();
  }, [siteId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 text-sm font-medium">
        Loading spatial intelligence metrics...
      </div>
    );
  }

  if (error || !siteData) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
        <AppNavbar />
        <div className="p-8 max-w-4xl mx-auto w-full">
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-4 rounded-lg text-sm">{error || 'Site not found.'}</div>
        </div>
      </div>
    );
  }

  const { site, evidence = [], rules_output = {} } = siteData;

  const gbifRecords = evidence.filter((e) => e.source === 'GBIF');
  const nasaRecords = evidence.filter((e) => e.source === 'NASA POWER');

  const climateChartData = {
    labels: nasaRecords.map((r) => r.observed_at ? new Date(r.observed_at).toLocaleDateString() : 'N/A'),
    datasets: [
      {
        label: 'Temperature (°C)',
        data: nasaRecords.map((r) => r.data?.temperature ?? null),
        borderColor: '#F59E0B',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        tension: 0.3,
      },
      {
        label: 'Precipitation (mm/day)',
        data: nasaRecords.map((r) => r.data?.precipitation ?? null),
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.3,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { labels: { color: '#94A3B8', font: { size: 11 } } },
      tooltip: { backgroundColor: '#1E293B' },
    },
    scales: {
      x: { ticks: { color: '#64748B' }, grid: { color: '#334155' } },
      y: { ticks: { color: '#64748B' }, grid: { color: '#334155' } },
    },
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col pb-12">
      <AppNavbar site={site} />

      <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Top Overview Banner */}
        <div className="bg-slate-800 border border-slate-700/80 p-6 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white">{site.name}</h1>
            <p className="text-xs text-slate-400 mt-1">
              Boundary registered via PostGIS GeoJSON • ID: #{site.id}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-md font-medium flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Spatial Polygon Active</span>
            </span>
          </div>
        </div>

        {/* Deterministic Rules Analysis */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-800 border border-slate-700/80 p-5 rounded-xl space-y-3">
            <div className="flex items-center space-x-2 text-emerald-400">
              <Activity className="w-4 h-4" />
              <h2 className="font-semibold text-sm text-slate-200">What Changed</h2>
            </div>
            {rules_output.what_changed?.length > 0 ? (
              <ul className="space-y-2">
                {rules_output.what_changed.map((item, idx) => (
                  <li key={idx} className="text-xs text-slate-300 bg-slate-900/50 p-2.5 rounded-md border border-slate-700/40">
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500 italic">No significant deviations detected from baseline metrics.</p>
            )}
          </div>

          <div className="bg-slate-800 border border-slate-700/80 p-5 rounded-xl space-y-3">
            <div className="flex items-center space-x-2 text-amber-400">
              <AlertTriangle className="w-4 h-4" />
              <h2 className="font-semibold text-sm text-slate-200">Needs Attention</h2>
            </div>
            {rules_output.needs_attention?.length > 0 ? (
              <ul className="space-y-2">
                {rules_output.needs_attention.map((item, idx) => (
                  <li key={idx} className="text-xs text-amber-200/90 bg-amber-500/10 p-2.5 rounded-md border border-amber-500/20">
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500 italic">All observations remain within acceptable deterministic parameters.</p>
            )}
          </div>
        </div>

        {/* Climate Visualization Chart */}
        <div className="bg-slate-800 border border-slate-700/80 p-5 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm text-slate-200 flex items-center space-x-2">
              <Sun className="w-4 h-4 text-amber-400" />
              <span>NASA POWER Meteorological Trends</span>
            </h2>
            <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-1 rounded border border-slate-700">
              Contextual Data
            </span>
          </div>
          {nasaRecords.length > 0 ? (
            <div className="h-64">
              <Line data={climateChartData} options={chartOptions} />
            </div>
          ) : (
            <div className="text-center py-10 text-xs text-slate-500">
              No climate time-series records fetched for this site coordinate boundary.
            </div>
          )}
        </div>

        {/* Provenance & Evidence Records */}
        <div className="bg-slate-800 border border-slate-700/80 p-5 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm text-slate-200 flex items-center space-x-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>Evidence Audit & Provenance Records ({evidence.length})</span>
            </h2>
          </div>

          {evidence.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">No evidence records logged yet.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {evidence.map((item) => (
                <div key={item.id} className="bg-slate-900/60 p-4 rounded-lg border border-slate-700/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-slate-200 flex items-center space-x-1.5">
                      {item.source === 'GBIF' ? <Bug className="w-3.5 h-3.5 text-emerald-400" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
                      <span>{item.source}</span>
                    </span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                      item.is_synthetic ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                    }`}>
                      {item.is_synthetic ? 'SYNTHETIC / DEMO' : 'LIVE API'}
                    </span>
                  </div>

                  <div className="text-xs text-slate-300">
                    <span className="text-slate-500">Type: </span>
                    <span className="font-mono text-slate-200">{item.evidence_type}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                    <div>Observed: {item.observed_at ? new Date(item.observed_at).toLocaleDateString() : 'N/A'}</div>
                    <div>Fetched: {item.fetched_at ? new Date(item.fetched_at).toLocaleDateString() : 'N/A'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}