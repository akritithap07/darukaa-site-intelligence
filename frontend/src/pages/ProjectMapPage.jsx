import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import { getProject, listSitesByProject, createSite, extractErrorMessage } from '../api/client';
import AppNavbar from '../components/AppNavbar';
import { Plus, MapPin, ExternalLink, ShieldAlert, Layers, Search, CheckCircle, ArrowLeft } from 'lucide-react';

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

  const loadData = React.useCallback(async () => {
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


  // Mapbox Initialization & Layer Updates
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

      if (sites && sites.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        let hasValidCoords = false;

        sites.forEach((site) => {
          const geojson = site.polygon_geojson;
          if (!geojson || !geojson.coordinates) return;

          const sourceId = `site-src-${site.id}`;
          const fillLayerId = `site-fill-${site.id}`;
          const lineLayerId = `site-line-${site.id}`;

          if (map.getSource(sourceId)) return;

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

          if (geojson.coordinates && geojson.coordinates[0]) {
            geojson.coordinates[0].forEach((coord) => {
              if (Array.isArray(coord) && coord.length >= 2) {
                bounds.extend(coord);
                hasValidCoords = true;
              }
            });
          }

          map.on('click', fillLayerId, () => navigate(`/sites/${site.id}`));
          map.on('mouseenter', fillLayerId, () => {
            map.getCanvas().style.cursor = 'pointer';
          });
          map.on('mouseleave', fillLayerId, () => {
            map.getCanvas().style.cursor = '';
          });
        });

        if (hasValidCoords && !bounds.isEmpty()) {
          map.fitBounds(bounds, { padding: 80, maxZoom: 14 });
        }
      }
    });

    return () => map.remove();
  }, [loading, sites, navigate]);

  const handleStartDraw = () => {
    setIsDrawing(true);
    setSaveSuccessMsg('');
    setDrawError('');
    if (drawRef.current) drawRef.current.changeMode('draw_polygon');
  };

  const handleCancelDraw = () => {
    setIsDrawing(false);
    setSiteName('');
    setSiteDrawnCoords(null);
    setDrawError('');
    if (drawRef.current) {
      drawRef.current.deleteAll();
      drawRef.current.changeMode('simple_select');
    }
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

      handleCancelDraw();
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
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 text-xs font-medium">
        Loading spatial environment & PostGIS boundaries...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col h-screen overflow-hidden">
      <AppNavbar project={project} />

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Left Sidebar: Site List & Controls */}
        <div className="w-full md:w-96 bg-slate-800 border-b md:border-b-0 md:border-r border-slate-700/80 flex flex-col z-10 shrink-0">
          {/* Header & Back Navigation */}
          <div className="p-4 border-b border-slate-700/80 space-y-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-slate-400 hover:text-white text-xs flex items-center space-x-1 transition"
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
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-md font-semibold text-xs flex items-center space-x-1.5 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Site</span>
                </button>
              ) : (
                <button
                  onClick={handleCancelDraw}
                  className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-md font-medium text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>

          {/* Toast / Error Banner */}
          {saveSuccessMsg && (
            <div className="m-3 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs rounded-md flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          {error && (
            <div className="m-3 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-md">
              {error}
            </div>
          )}

          {/* Mode Switch: Drawing Form vs Site List */}
          {isDrawing ? (
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-md text-xs text-emerald-300">
                <span className="font-semibold block mb-0.5">Draw Site Boundary</span>
                Click points on the Mapbox satellite map to enclose your target site boundary.
              </div>

              {drawError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-md">
                  {drawError}
                </div>
              )}

              <form onSubmit={handleSaveSite} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Site Name</label>
                  <input
                    type="text"
                    required
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    placeholder="e.g. Riparian Corridor Plot 1"
                    className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="bg-slate-900/60 p-3 rounded-md border border-slate-700/50">
                  <div className="text-[11px] text-slate-400 font-medium">Boundary Polygon Capture</div>
                  <div className={`text-xs font-bold mt-1 ${siteDrawnCoords ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {siteDrawnCoords ? 'Boundary Captured ✓' : 'Drawing on Map... (click points)'}
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={handleCancelDraw}
                    className="w-1/2 bg-slate-700 hover:bg-slate-600 text-slate-300 py-2 rounded-md font-medium text-xs transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingSite || !siteDrawnCoords}
                    className="w-1/2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-2 rounded-md font-semibold text-xs transition cursor-pointer"
                  >
                    {savingSite ? 'Saving...' : 'Save Site'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Search Bar */}
              <div className="p-3 border-b border-slate-700/50">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search sites..."
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-md pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Site List */}
              <div className="p-3 flex-1 overflow-y-auto space-y-2">
                {filteredSites.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 text-xs">
                    <Layers className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No sites found. Click "Add Site" to draw a boundary polygon.
                  </div>
                ) : (
                  filteredSites.map((site) => (
                    <div
                      key={site.id}
                      onClick={() => navigate(`/sites/${site.id}`)}
                      className="p-3 bg-slate-900/50 hover:bg-slate-700/40 border border-slate-700/50 rounded-lg cursor-pointer transition flex items-center justify-between group"
                    >
                      <div className="flex items-center space-x-3">
                        <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div>
                          <div className="text-xs font-semibold text-slate-200 group-hover:text-emerald-400 transition">
                            {site.name}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
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