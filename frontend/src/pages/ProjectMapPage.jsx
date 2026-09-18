import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import mapboxgl from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import { listSitesByProject, createSite } from "../api/client";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

export default function ProjectMapPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const drawRef = useRef(null);

  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [drawing, setDrawing] = useState(false);
  const [pendingName, setPendingName] = useState("");
  const [pendingPolygon, setPendingPolygon] = useState(null);

  async function loadSites() {
    setLoading(true);
    try {
      const data = await listSitesByProject(projectId);
      setSites(data);
    } catch (err) {
      setError("Could not load sites for this project.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    if (!MAPBOX_TOKEN) {
      setError("Mapbox token missing. Set VITE_MAPBOX_TOKEN in frontend/.env");
      return;
    }
    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center: [78.9629, 20.5937],
      zoom: 4,
    });
    mapRef.current = map;

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: { polygon: true, trash: true },
    });
    map.addControl(draw);
    drawRef.current = draw;

    map.on("draw.create", (e) => {
      const feature = e.features[0];
      setPendingPolygon(feature.geometry.coordinates);
    });

    return () => map.remove();
  }, []);

  // Render existing site polygons once sites and map are ready
  useEffect(() => {
    const map = mapRef.current;
    if (!map || sites.length === 0) return;

    const addLayers = () => {
      if (map.getSource("existing-sites")) {
        map.getSource("existing-sites").setData({
          type: "FeatureCollection",
          features: sites
            .filter((s) => s.polygon_geojson && s.polygon_geojson.coordinates)
            .map((s) => ({
              type: "Feature",
              properties: { id: s.id, name: s.name },
              geometry: s.polygon_geojson,
            })),
        });
        return;
      }
      map.addSource("existing-sites", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: sites
            .filter((s) => s.polygon_geojson && s.polygon_geojson.coordinates)
            .map((s) => ({
              type: "Feature",
              properties: { id: s.id, name: s.name },
              geometry: s.polygon_geojson,
            })),
        },
      });
      map.addLayer({
        id: "existing-sites-fill",
        type: "fill",
        source: "existing-sites",
        paint: { "fill-color": "#4fae7f", "fill-opacity": 0.25 },
      });
      map.addLayer({
        id: "existing-sites-line",
        type: "line",
        source: "existing-sites",
        paint: { "line-color": "#4fae7f", "line-width": 2 },
      });
      map.on("click", "existing-sites-fill", (e) => {
        const id = e.features[0].properties.id;
        navigate(`/sites/${id}`);
      });
      map.on("mouseenter", "existing-sites-fill", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "existing-sites-fill", () => {
        map.getCanvas().style.cursor = "";
      });

      // Fit bounds to sites
      const first = sites.find((s) => s.centroid_lat);
      if (first) {
        map.flyTo({ center: [first.centroid_lon, first.centroid_lat], zoom: 11 });
      }
    };

    if (map.isStyleLoaded()) addLayers();
    else map.once("load", addLayers);
  }, [sites, navigate]);

  async function handleSavePolygon(e) {
    e.preventDefault();
    if (!pendingPolygon || !pendingName.trim()) return;
    try {
      await createSite(projectId, pendingName, pendingPolygon);
      setPendingPolygon(null);
      setPendingName("");
      setDrawing(false);
      drawRef.current.deleteAll();
      loadSites();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not save polygon.");
    }
  }

  return (
    <div className="app-shell">
      <div className="top-bar">
        <div>
          <Link to="/" className="muted">
            ← Projects
          </Link>
          <div className="brand" style={{ marginTop: 4 }}>
            Site Map
          </div>
        </div>
        <button className="btn btn-secondary" onClick={() => setDrawing((d) => !d)}>
          {drawing ? "Cancel drawing" : "Draw new site"}
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="map-container" ref={mapContainer} />

      {pendingPolygon && (
        <form className="card" onSubmit={handleSavePolygon} style={{ marginTop: 16 }}>
          <h3>Save New Site</h3>
          <input
            placeholder="Site name"
            value={pendingName}
            onChange={(e) => setPendingName(e.target.value)}
            style={{ marginBottom: 12 }}
          />
          <button className="btn" type="submit">
            Save polygon to PostGIS
          </button>
        </form>
      )}

      <div className="section-title">Sites in this project</div>
      {loading ? (
        <div className="loading">Loading sites...</div>
      ) : (
        <div className="grid">
          {sites.map((s) => (
            <div key={s.id} className="card project-card" onClick={() => navigate(`/sites/${s.id}`)}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>{s.name}</div>
              <div className="muted">{s.area_hectares ? `${s.area_hectares} ha` : "Area pending"}</div>
            </div>
          ))}
          {sites.length === 0 && <div className="muted">No sites yet — draw a polygon to create one.</div>}
        </div>
      )}
    </div>
  );
}
