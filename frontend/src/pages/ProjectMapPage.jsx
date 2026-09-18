import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import { getProject, createSite } from '../api/client';
import { ArrowLeft, Plus, MapPin, ExternalLink, ShieldAlert } from 'lucide-react';

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

  // New site form state
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
        setError(err.response?.data?.detail || 'Failed to load project');
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
      center: [78.9629, 20.5937], // Default India view
      zoom: 4,
    });

    mapRef.current = map;

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true,
      },
      defaultMode: 'simple_select',
    });

    drawRef.current = draw;
    map.addControl(draw, 'top-left');

    const updateDrawnShape = () => {
      const data = draw.getAll();
      if (data.features.length > 0) {
        const lastFeature = data.features[data.features.length - 1];
        setSiteDrawnGeoJSON(lastFeature.geometry);
      } else {
        setSiteDrawnGeoJSON(null);
      }
    };

    map.on('draw.create', updateDrawnShape);
    map.on('draw.update', updateDrawnShape);
    map.on('draw.delete', updateDrawnShape);

    map.on('load', () => {
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
            paint: {
              'fill-color': '#10B981',
              'fill-opacity': 0.3,
            },
          });

          map.addLayer({
            id: lineLayerId,
            type: 'line',
            source: sourceId,
            paint: {
              'line-color': '#059669',
              'line-width': 2,
            },
          });

          // Expand bounds
          if (site.boundary.coordinates && site.boundary.coordinates[0]) {
            site.boundary.coordinates[0].forEach((coord) => {
              bounds.extend(coord);
            });
          }

          // Click site polygon -> Navigate
          map.on('click', fillLayerId, () => {
            navigate(`/site/${site.id}`);
          });

          map.on('mouseenter', fillLayerId, () => {
            map.getCanvas().style.cursor = 'pointer';
          });
          map.on('mouseleave', fillLayerId, () => {
            map.getCanvas().style.cursor = '';
          });
        });

        if (!bounds.isEmpty()) {
          map.fitBounds(bounds, { padding: 80 });
        }
      }
    });

    return () => {
      map.remove();
    };
  }, [loading, project, navigate]);

  const handleStartDraw = () => {
    setIsDrawing(true);
    if (drawRef.current) {
      drawRef.current.changeMode('draw_polygon');
    }
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
    if (!siteName.trim()) {
      alert('Please provide a site name');
      return;
    }
    if (!siteDrawnGeoJSON) {
      alert('Please draw a polygon on the map first');
      return;
    }

    setSavingSite(true);
    try {
      await createSite({
        project_id: parseInt(projectId, 10),
        name: siteName,
        boundary: siteDrawnGeoJSON,
      });

      handleCancelDraw();
      // Reload project
      const res = await getProject(projectId);
      setProject(res.data);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to save site');
    } finally {
      setSavingSite(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-300">
        Loading spatial environment...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col h-screen">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between z-10">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 text-slate-400 hover:text-white bg-slate-700/50 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-lg text-white">{project?.name}</h1>
            <p className="text-xs text-slate-400">{project?.description || 'Site Spatial Intelligence Workspace'}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {!isDrawing ? (
            <button
              onClick={handleStartDraw}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center space-x-2 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Site</span>
            </button>
          ) : (
            <button
              onClick={handleCancelDraw}
              className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-lg font-medium text-sm transition"
            >
              Cancel Drawing
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Map Container */}
        <div className="flex-1 h-full relative">
          {!mapboxToken && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-amber-500/10 border border-amber-500/30 text-amber-300 px-4 py-2 rounded-lg text-xs flex items-center space-x-2 backdrop-blur-md">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>VITE_MAPBOX_TOKEN is missing. Map features require a valid token.</span>
            </div>
          )}
          <div ref={mapContainerRef} className="w-full h-full" />
        </div>

        {/* Sidebar */}
        <div className="w-80 bg-slate-800 border-l border-slate-700 flex flex-col z-10">
          {isDrawing ? (
            <div className="p-5 space-y-4">
              <h3 className="font-bold text-slate-200 text-sm uppercase tracking-wider">Draw Site Polygon</h3>
              <p className="text-xs text-slate-400">
                Use the polygon tool on the map to define boundary coordinates.
              </p>

              <form onSubmit={handleSaveSite} className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Site Name</label>
                  <input
                    type="text"
                    required
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    placeholder="e.g. Mangrove Core Zone A"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                  <span className="text-xs font-medium text-slate-400">Status: </span>
                  <span className={`text-xs font-semibold ${siteDrawnGeoJSON ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {siteDrawnGeoJSON ? 'Polygon Drawn ✓' : 'Waiting for map input...'}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={savingSite || !siteDrawnGeoJSON}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-2 rounded-lg font-medium text-sm transition"
                >
                  {savingSite ? 'Saving to PostGIS...' : 'Save Site Boundary'}
                </button>
              </form>
            </div>
          ) : (
            <div className="p-5 flex-1 flex flex-col overflow-y-auto">
              <h3 className="font-bold text-slate-200 text-sm uppercase tracking-wider mb-4">
                Project Sites ({project?.sites?.length || 0})
              </h3>

              {error && <div className="text-red-400 text-xs mb-3">{error}</div>}

              {project?.sites?.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  No site boundaries registered yet. Click "Add New Site" to draw one.
                </div>
              ) : (
                <div className="space-y-3">
                  {project?.sites?.map((site) => (
                    <div
                      key={site.id}
                      onClick={() => navigate(`/site/${site.id}`)}
                      className="p-3 bg-slate-900/60 hover:bg-slate-700/50 border border-slate-700/60 rounded-lg cursor-pointer transition flex items-center justify-between group"
                    >
                      <div className="flex items-center space-x-3">
                        <MapPin className="w-4 h-4 text-emerald-400" />
                        <div>
                          <div className="text-sm font-medium text-slate-200 group-hover:text-emerald-400 transition">
                            {site.name}
                          </div>
                          <div className="text-[10px] text-slate-500">ID: {site.id}</div>
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition" />
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