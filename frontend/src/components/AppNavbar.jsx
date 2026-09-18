import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Globe, LayoutDashboard, LogOut, ChevronRight } from 'lucide-react';

export default function AppNavbar({ project, site }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <header className="bg-slate-800/95 backdrop-blur-md border-b border-slate-700/80 px-6 py-3.5 flex items-center justify-between sticky top-0 z-50 shadow-md">
      <div className="flex items-center space-x-4">
        <Link to="/dashboard" className="flex items-center space-x-2.5 text-emerald-400 hover:text-emerald-300 transition">
          <Globe className="w-6 h-6 text-emerald-500" />
          <span className="font-bold text-base text-white tracking-wide">DARUKAA <span className="text-emerald-400 font-normal">EARTH</span></span>
        </Link>

        <span className="text-slate-600">/</span>

        {/* Breadcrumb Navigation */}
        <nav className="flex items-center space-x-2 text-xs text-slate-300">
          <Link to="/dashboard" className="hover:text-white flex items-center space-x-1 transition">
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </Link>

          {project && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              <Link to={`/project/${project.id}/map`} className="hover:text-white font-medium text-slate-200 transition">
                {project.name}
              </Link>
            </>
          )}

          {site && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-emerald-400 font-semibold">{site.name}</span>
            </>
          )}
        </nav>
      </div>

      <div className="flex items-center space-x-4">
        <button
          onClick={handleLogout}
          className="flex items-center space-x-1.5 text-xs font-medium text-slate-400 hover:text-rose-400 bg-slate-900/50 hover:bg-slate-900 border border-slate-700/60 px-3 py-1.5 rounded-md transition"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </header>
  );
}