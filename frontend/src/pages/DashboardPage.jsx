import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listProjects, createProject, extractErrorMessage } from '../api/client';
import AppNavbar from '../components/AppNavbar';
import { Plus, FolderPlus, MapPin, Database, ArrowRight, ShieldCheck, Activity, Layers } from 'lucide-react';

export default function DashboardPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const navigate = useNavigate();

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const data = await listProjects();
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not load projects. Please verify backend connection.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setCreateError('');
    try {
      await createProject(name.trim(), description.trim());
      setName('');
      setDescription('');
      setShowModal(false);
      await loadData();
    } catch (err) {
      setCreateError(extractErrorMessage(err, 'Failed to create project.'));
    } finally {
      setCreating(false);
    }
  }

  const totalSites = projects.reduce((acc, p) => acc + (p.site_count || 0), 0);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <AppNavbar />

      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8">
        {/* Workspace Title Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
              <span>Site Intelligence Workspace</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Monitor environmental evidence, spatial boundaries, and deterministic signals across your projects.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center space-x-2 transition shadow-lg shadow-emerald-950/40 cursor-pointer self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>
        </div>

        {/* Metrics Overview Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-800/80 border border-slate-700/70 p-4 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Projects</span>
              <FolderPlus className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white mt-2">{projects.length}</div>
            <div className="text-[11px] text-slate-500 mt-1">Active workspaces</div>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/70 p-4 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Monitoring Sites</span>
              <MapPin className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white mt-2">{totalSites}</div>
            <div className="text-[11px] text-slate-500 mt-1">PostGIS polygons</div>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/70 p-4 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Evidence Sources</span>
              <Database className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white mt-2">2 Active</div>
            <div className="text-[11px] text-slate-500 mt-1">GBIF & NASA POWER</div>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/70 p-4 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Engine Mode</span>
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-sm font-bold text-emerald-400 mt-2">Deterministic</div>
            <div className="text-[11px] text-slate-500 mt-1">Rule-based signals</div>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl flex items-center justify-between">
            <span>{error}</span>
            <button onClick={loadData} className="underline hover:text-white text-xs">Retry</button>
          </div>
        )}

        {/* Projects Grid Section */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center space-x-2">
            <Layers className="w-4 h-4 text-slate-400" />
            <span>Active Environmental Projects</span>
          </h2>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-xl animate-pulse space-y-4">
                  <div className="h-5 bg-slate-700/60 rounded w-3/4"></div>
                  <div className="h-3 bg-slate-700/40 rounded w-full"></div>
                  <div className="h-3 bg-slate-700/40 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-12 text-center space-y-4">
              <FolderPlus className="w-10 h-10 text-slate-600 mx-auto" />
              <div>
                <h3 className="text-sm font-semibold text-slate-200">No Projects Found</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Create your first project to start mapping site polygons and gathering environmental evidence.
                </p>
              </div>
              <button
                onClick={() => setShowModal(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-lg inline-flex items-center space-x-2 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Project</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="bg-slate-800 border border-slate-700/80 hover:border-emerald-500/50 p-6 rounded-xl cursor-pointer transition group flex flex-col justify-between space-y-4 hover:shadow-xl hover:shadow-emerald-950/20"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                        Project #{project.id}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <span>{project.site_count || 0} {project.site_count === 1 ? 'site' : 'sites'}</span>
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition">
                      {project.name}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2">
                      {project.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-700/60 flex items-center justify-between text-xs">
                    <span className="text-slate-500 flex items-center space-x-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span>PostGIS Protected</span>
                    </span>
                    <span className="font-semibold text-emerald-400 group-hover:translate-x-1 transition flex items-center space-x-1">
                      <span>Open Workspace</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* New Project Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Create Environmental Project</h3>

            {createError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-lg">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sundarbans Restoration Corridor"
                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description (Optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Brief summary of environmental goals or baseline target..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !name.trim()}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-md transition"
                >
                  {creating ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
