import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import { getProject, createSite } from '../api/client';
import AppNavbar from '../components/AppNavbar';
import { Plus, MapPin, ExternalLink, ShieldAlert, Layers } from 'lucide-react';

export default function ProjectMapPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const drawRef = useRef(null);

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);

  const [siteName, setSiteName] = useState('');
  const [siteDrawnGeoJSON, setSiteDrawnGeoJSON] = useState(null);
  const [savingSite, setSavingSite] = useState(false);

  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;

  useEffect(() => {
    if (mapboxToken) {
      mapboxgl.accessToken = mapboxToken;
    }
  }, [mapboxToken]);

  useEffect(() => {
    async function loadProjectData() {
      try {
        const res = await getProject(projectId);
        setProject(res.data);
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load project details.');
      } finally {
        setLoading(false);
      }
    }
    loadProjectData();
  }, [projectId]);

  useEffect(() => {
    if (loading || !project || !mapContainerRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: [78.9629, 20.5937],
      zoom: 4,
    });

    mapRef.current = map;

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: { polygon: true, trash: true },
      defaultMode: 'simple_select',
    });

    drawRef.current = draw;
    map.addControl(draw, 'top-left');
    map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

    const updateDrawnShape = () => {
      const data = draw.getAll();
      if (data.features.length > 0) {
        setSiteDrawnGeoJSON(data.features[data.features.length - 1].geometry);
      } else {
        setSiteDrawnGeoJSON(null);
      }
    };

    map.on('draw.create', updateDrawnShape);
    map.on('draw.update', updateDrawnShape);
    map.on('draw.delete', updateDrawnShape);

    map.on('load', () => {
      map.resize();

      if (project.sites && project.sites.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();

        project.sites.forEach((site) => {
          if (!site.boundary) return;

          const sourceId = `site-src-${site.id}`;
          const fillLayerId = `site-fill-${site.id}`;
          const lineLayerId = `site-line-${site.id}`;

          map.addSource(sourceId, {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: site.boundary,
              properties: { name: site.name, id: site.id },
            },
          });

          map.addLayer({
            id: fillLayerId,
            type: 'fill',
            source: sourceId,
            paint: { 'fill-color': '#10B981', 'fill-opacity': 0.35 },
          });

          map.addLayer({
            id: lineLayerId,
            type: 'line',
            source: sourceId,
            paint: { 'line-color': '#059669', 'line-width': 2 },
          });

          if (site.boundary.coordinates && site.boundary.coordinates[0]) {
            site.boundary.coordinates[0].forEach((coord) => bounds.extend(coord));
          }

          map.on('click', fillLayerId, () => navigate(`/site/${site.id}`));
          map.on('mouseenter', fillLayerId, () => { map.getCanvas().style.cursor = 'pointer'; });
          map.on('mouseleave', fillLayerId, () => { map.getCanvas().style.cursor = ''; });
        });

        if (!bounds.isEmpty()) {
          map.fitBounds(bounds, { padding: 80, maxZoom: 14 });
        }
      }
    });

    return () => map.remove();
  }, [loading, project, navigate]);

  const handleStartDraw = () => {
    setIsDrawing(true);
    if (drawRef.current) drawRef.current.changeMode('draw_polygon');
  };

  const handleCancelDraw = () => {
    setIsDrawing(false);
    setSiteName('');
    setSiteDrawnGeoJSON(null);
    if (drawRef.current) {
      drawRef.current.deleteAll();
      drawRef.current.changeMode('simple_select');
    }
  };

  const handleSaveSite = async (e) => {
    e.preventDefault();
    if (!siteName.trim()) return alert('Please enter a site name');
    if (!siteDrawnGeoJSON) return alert('Please draw a polygon boundary on the map first');

    setSavingSite(true);
    try {
      await createSite({
        project_id: parseInt(projectId, 10),
        name: siteName,
        boundary: siteDrawnGeoJSON,
      });

      handleCancelDraw();
      const res = await getProject(projectId);
      setProject(res.data);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to save site boundary');
    } finally {
      setSavingSite(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 text-sm font-medium">
        Loading spatial environment...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col h-screen overflow-hidden">
      <AppNavbar project={project} />

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Map Viewport */}
        <div className="flex-1 h-[60vh] md:h-full relative bg-slate-950">
          {!mapboxToken && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-amber-500/10 border border-amber-500/30 text-amber-300 px-4 py-2 rounded-lg text-xs flex items-center space-x-2 backdrop-blur-md">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              <span>VITE_MAPBOX_TOKEN is missing. Map requires a valid public access token.</span>
            </div>
          )}
          <div ref={mapContainerRef} className="w-full h-full min-h-[450px]" />
        </div>

        {/* Control Panel Sidebar */}
        <div className="w-full md:w-80 bg-slate-800 border-t md:border-t-0 md:border-l border-slate-700/80 flex flex-col z-10">
          <div className="p-4 border-b border-slate-700/80 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-sm text-slate-100">{project?.name}</h2>
              <p className="text-xs text-slate-400">{project?.sites?.length || 0} Site Boundaries</p>
            </div>
            {!isDrawing ? (
              <button
                onClick={handleStartDraw}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-md font-medium text-xs flex items-center space-x-1.5 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Draw Site</span>
              </button>
            ) : (
              <button
                onClick={handleCancelDraw}
                className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-md font-medium text-xs transition"
              >
                Cancel
              </button>
            )}
          </div>

          {isDrawing ? (
            <div className="p-4 space-y-4">
              <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-300">Define Boundary</h3>
              <form onSubmit={handleSaveSite} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Site Name</label>
                  <input
                    type="text"
                    required
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    placeholder="e.g. Coastal Mangrove Plot A"
                    className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="bg-slate-900/60 p-3 rounded-md border border-slate-700/50">
                  <div className="text-[11px] text-slate-400">Boundary Status</div>
                  <div className={`text-xs font-semibold mt-0.5 ${siteDrawnGeoJSON ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {siteDrawnGeoJSON ? 'Polygon Shape Defined ✓' : 'Click Map to Add Vertices...'}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={savingSite || !siteDrawnGeoJSON}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-2 rounded-md font-medium text-xs transition"
                >
                  {savingSite ? 'Persisting to PostGIS...' : 'Save Site Boundary'}
                </button>
              </form>
            </div>
          ) : (
            <div className="p-4 flex-1 overflow-y-auto">
              {error && <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-md mb-3">{error}</div>}
              {project?.sites?.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs">
                  <Layers className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  No sites registered. Click "Draw Site" to map a polygon.
                </div>
              ) : (
                <div className="space-y-2">
                  {project?.sites?.map((site) => (
                    <div
                      key={site.id}
                      onClick={() => navigate(`/site/${site.id}`)}
                      className="p-3 bg-slate-900/50 hover:bg-slate-700/40 border border-slate-700/50 rounded-md cursor-pointer transition flex items-center justify-between group"
                    >
                      <div className="flex items-center space-x-2.5">
                        <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div>
                          <div className="text-xs font-medium text-slate-200 group-hover:text-emerald-400 transition">{site.name}</div>
                          <div className="text-[10px] text-slate-500">PostGIS ID: #{site.id}</div>
                        </div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}