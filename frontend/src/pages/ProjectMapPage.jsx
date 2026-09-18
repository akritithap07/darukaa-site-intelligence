import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import { getProject, listSitesByProject, createSite, extractErrorMessage } from '../api/client';
import AppNavbar from '../components/AppNavbar';
import { Plus, MapPin, ExternalLink, ShieldAlert, Layers, Search, CheckCircle, ArrowLeft, XCircle, MousePointer } from 'lucide-react';

export default function ProjectMapPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const drawRef = useRef(null);

  const [project, setProject] = useState(null);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [isDrawing, setIsDrawing] = useState(false);
  const [siteName, setSiteName] = useState('');
  const [siteDrawnCoords, setSiteDrawnCoords] = useState(null);
  const [savingSite, setSavingSite] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [drawError, setDrawError] = useState('');

  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;

  useEffect(() => {
    if (mapboxToken) {
      mapboxgl.accessToken = mapboxToken;
    }
  }, [mapboxToken]);

  const loadData = useCallback(async () => {
    try {
      setError('');
      const [projRes, sitesRes] = await Promise.all([
        getProject(projectId),
        listSitesByProject(projectId),
      ]);
      setProject(projRes);
      setSites(Array.isArray(sitesRes) ? sitesRes : []);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load project or site boundaries.'));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Exit drawing mode function
  const handleExitDraw = useCallback(() => {
    setIsDrawing(false);
    setSiteName('');
    setSiteDrawnCoords(null);
    setDrawError('');
    if (drawRef.current) {
      try {
        drawRef.current.deleteAll();
        drawRef.current.changeMode('simple_select');
      } catch (e) {
        console.warn('Mapbox draw mode reset warning:', e);
      }
    }
  }, []);

  // Keyboard Escape listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isDrawing) {
        handleExitDraw();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawing, handleExitDraw]);

  // Helper function to render site polygons onto Mapbox instance
  const renderPolygonsOnMap = useCallback((map, siteList) => {
    if (!map || !siteList || siteList.length === 0) return;

    const bounds = new mapboxgl.LngLatBounds();
    let hasValidCoords = false;

    siteList.forEach((site) => {
      const geojson = site.polygon_geojson;
      if (!geojson || !geojson.coordinates) return;

      const sourceId = `site-src-${site.id}`;
      const fillLayerId = `site-fill-${site.id}`;
      const lineLayerId = `site-line-${site.id}`;

      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: geojson,
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
          paint: { 'line-color': '#34D399', 'line-width': 2.5 },
        });

        map.on('click', fillLayerId, () => navigate(`/sites/${site.id}`));
        map.on('mouseenter', fillLayerId, () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', fillLayerId, () => {
          map.getCanvas().style.cursor = '';
        });
      }

      if (geojson.coordinates && geojson.coordinates[0]) {
        geojson.coordinates[0].forEach((coord) => {
          if (Array.isArray(coord) && coord.length >= 2) {
            bounds.extend(coord);
            hasValidCoords = true;
          }
        });
      }
    });

    if (hasValidCoords && !bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 80, maxZoom: 14 });
    }
  }, [navigate]);

  // Mapbox Initialization
  useEffect(() => {
    if (loading || !mapContainerRef.current) return;

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
        const lastFeature = data.features[data.features.length - 1];
        if (lastFeature.geometry.type === 'Polygon') {
          setSiteDrawnCoords(lastFeature.geometry.coordinates);
          setDrawError('');
        }
      } else {
        setSiteDrawnCoords(null);
      }
    };

    map.on('draw.create', updateDrawnShape);
    map.on('draw.update', updateDrawnShape);
    map.on('draw.delete', updateDrawnShape);

    map.on('load', () => {
      map.resize();
      renderPolygonsOnMap(map, sites);
    });

    return () => map.remove();
  }, [loading, navigate, renderPolygonsOnMap, sites]);

  // Re-render polygons when sites array updates
  useEffect(() => {
    if (mapRef.current && mapRef.current.isStyleLoaded()) {
      renderPolygonsOnMap(mapRef.current, sites);
    }
  }, [sites, renderPolygonsOnMap]);

  const handleStartDraw = () => {
    setIsDrawing(true);
    setSaveSuccessMsg('');
    setDrawError('');
    if (drawRef.current) drawRef.current.changeMode('draw_polygon');
  };

  const handleSaveSite = async (e) => {
    e.preventDefault();
    setDrawError('');

    if (!siteName.trim()) {
      setDrawError('Please enter a site name.');
      return;
    }
    if (!siteDrawnCoords) {
      setDrawError('Please draw a polygon boundary on the map first.');
      return;
    }

    setSavingSite(true);
    try {
      const newSite = await createSite({
        project_id: projectId,
        name: siteName.trim(),
        polygon: siteDrawnCoords,
      });

      handleExitDraw();
      setSaveSuccessMsg(`Site "${newSite.name}" saved successfully to PostGIS.`);
      await loadData();
    } catch (err) {
      setDrawError(extractErrorMessage(err, 'Failed to save site boundary to PostGIS.'));
    } finally {
      setSavingSite(false);
    }
  };

  const filteredSites = sites.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs font-medium">
        Loading spatial environment & PostGIS boundaries...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col h-screen overflow-hidden">
      <AppNavbar project={project} />

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Left Sidebar: Site List & Controls */}
        <div className="w-full md:w-96 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col z-10 shrink-0">
          {/* Header & Back Navigation */}
          <div className="p-4 border-b border-slate-800 space-y-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-slate-400 hover:text-white text-xs flex items-center space-x-1.5 transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </button>

            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-sm text-slate-100">{project?.name || 'Project Workspace'}</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">{sites.length} Monitoring Sites Registered</p>
              </div>

              {!isDrawing ? (
                <button
                  onClick={handleStartDraw}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3 py-1.5 rounded-lg font-bold text-xs flex items-center space-x-1.5 transition shadow-md shadow-emerald-950/40 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Site</span>
                </button>
              ) : (
                <button
                  onClick={handleExitDraw}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg font-medium text-xs flex items-center space-x-1 transition cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Exit Mode</span>
                </button>
              )}
            </div>
          </div>

          {/* Toast / Error Banner */}
          {saveSuccessMsg && (
            <div className="m-3 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs rounded-lg flex items-center space-x-2 animate-fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          {error && (
            <div className="m-3 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-lg animate-fade-in">
              {error}
            </div>
          )}

          {/* Mode Switch: Drawing Form vs Site List */}
          {isDrawing ? (
            <div className="p-4 space-y-4 overflow-y-auto flex-1 animate-fade-in">
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-xl text-xs text-emerald-300 space-y-1.5">
                <span className="font-bold flex items-center space-x-1.5 text-emerald-400">
                  <MousePointer className="w-3.5 h-3.5" />
                  <span>Drawing Boundary Polygon</span>
                </span>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  1. Click map points to outline boundary.<br />
                  2. Double-click or click first point to close shape.<br />
                  3. Enter site name & click <strong>Save Site</strong>.
                </p>
              </div>

              {drawError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-lg">
                  {drawError}
                </div>
              )}

              <form onSubmit={handleSaveSite} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Site Name</label>
                  <input
                    type="text"
                    required
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    placeholder="e.g. Riparian Corridor Plot 1"
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                  <div className="text-[11px] text-slate-400 font-medium">Boundary Status</div>
                  <div className={`text-xs font-bold ${siteDrawnCoords ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {siteDrawnCoords ? 'Boundary Captured ✓' : 'Click points on map to define shape...'}
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={handleExitDraw}
                    className="w-1/2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 py-2 rounded-xl font-medium text-xs transition cursor-pointer"
                  >
                    Cancel / Exit
                  </button>
                  <button
                    type="submit"
                    disabled={savingSite || !siteDrawnCoords}
                    className="w-1/2 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-slate-950 py-2 rounded-xl font-bold text-xs transition cursor-pointer"
                  >
                    {savingSite ? 'Saving to PostGIS...' : 'Save Site'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Search Bar */}
              <div className="p-3 border-b border-slate-800">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search sites..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Site List */}
              <div className="p-3 flex-1 overflow-y-auto space-y-2">
                {filteredSites.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 text-xs">
                    <Layers className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                    No sites found. Click "Add Site" to draw a boundary polygon.
                  </div>
                ) : (
                  filteredSites.map((site) => (
                    <div
                      key={site.id}
                      onClick={() => navigate(`/sites/${site.id}`)}
                      className="p-3.5 bg-slate-850 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 rounded-xl cursor-pointer transition flex items-center justify-between group"
                    >
                      <div className="flex items-center space-x-3">
                        <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div>
                          <div className="text-xs font-semibold text-slate-200 group-hover:text-emerald-400 transition">
                            {site.name}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Area: {site.area_hectares || '0'} ha • ID #{site.id}
                          </div>
                        </div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition" />
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Area: Large Mapbox Map */}
        <div className="flex-1 h-[50vh] md:h-full relative bg-slate-950">
          {/* Overlay Exit Drawing Banner on Map when active */}
          {isDrawing && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-slate-900/90 border border-emerald-500/40 text-white px-4 py-2 rounded-full text-xs flex items-center space-x-3 backdrop-blur-md shadow-2xl animate-fade-in">
              <span className="flex items-center space-x-1.5 text-emerald-400 font-semibold">
                <MousePointer className="w-3.5 h-3.5 animate-pulse" />
                <span>Drawing Mode Active</span>
              </span>
              <span className="text-slate-600">|</span>
              <button
                onClick={handleExitDraw}
                className="text-xs font-bold text-rose-400 hover:text-rose-300 flex items-center space-x-1 underline cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Exit Drawing Mode</span>
              </button>
            </div>
          )}

          {!mapboxToken && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-amber-500/10 border border-amber-500/30 text-amber-300 px-4 py-2 rounded-lg text-xs flex items-center space-x-2 backdrop-blur-md shadow-lg">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Mapbox Token Missing (VITE_MAPBOX_TOKEN). Add token to environment variables to view satellite imagery.</span>
            </div>
          )}
          <div ref={mapContainerRef} className="w-full h-full min-h-[400px]" />
        </div>
      </div>
    </div>
  );
}