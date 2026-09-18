import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listProjects, createProject, logout } from "../api/client";

export default function DashboardPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const navigate = useNavigate();

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await listProjects();
      setProjects(data);
    } catch (err) {
      setError("Could not load projects. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) return;
    await createProject(name, "");
    setName("");
    setShowNew(false);
    load();
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="app-shell">
      <div className="top-bar">
        <div>
          <div className="brand">Darukaa Earth</div>
          <div className="brand-sub">Project Dashboard</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => setShowNew((s) => !s)}>
            + New Project
          </button>
          <button className="btn btn-secondary" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </div>

      {showNew && (
        <form className="card" onSubmit={handleCreate}>
          <h3>New Project</h3>
          <input
            placeholder="Project name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ marginBottom: 12 }}
          />
          <button className="btn" type="submit">
            Create
          </button>
        </form>
      )}

      {error && <div className="error-banner">{error}</div>}
      {loading ? (
        <div className="loading">Loading projects...</div>
      ) : (
        <div className="grid">
          {projects.map((p) => (
            <div key={p.id} className="card project-card" onClick={() => navigate(`/projects/${p.id}`)}>
              <h3>Project</h3>
              <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>{p.name}</div>
              <div className="muted">
                {p.site_count} site{p.site_count === 1 ? "" : "s"}
              </div>
            </div>
          ))}
          {projects.length === 0 && (
            <div className="muted">No projects yet. Create one to get started.</div>
          )}
        </div>
      )}
    </div>
  );
}
