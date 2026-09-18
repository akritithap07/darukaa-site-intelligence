import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login, extractErrorMessage } from '../api/client';
import { Globe, Lock, Mail, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login({ email, password });
      navigate('/dashboard');
    } catch (err) {
      setError(extractErrorMessage(err, 'Invalid credentials. Please check your email and password.'));
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail('demo@darukaa.earth');
    setPassword('demo1234');
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 relative overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-md w-full bg-slate-900/90 backdrop-blur-xl p-8 rounded-2xl border border-slate-800 shadow-2xl shadow-emerald-950/20 relative z-10 animate-fade-in space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 rounded-full text-emerald-400 mb-2">
            <Globe className="w-4 h-4 text-emerald-400 animate-spin-slow" />
            <span className="text-xs font-bold tracking-widest uppercase">DARUKAA EARTH</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Site Intelligence Workspace</h1>
          <p className="text-xs text-slate-400">Environmental Evidence & Biodiversity Monitoring System</p>
        </div>

        {/* Demo Quick Fill Banner */}
        <div className="bg-slate-800/60 border border-slate-700/60 p-3 rounded-xl flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-slate-300">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Demo: <code className="text-emerald-300">demo@darukaa.earth</code></span>
          </div>
          <button
            type="button"
            onClick={handleFillDemo}
            className="text-[11px] font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-lg transition cursor-pointer"
          >
            Auto-fill
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl flex items-start space-x-2.5 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email or Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3.5 py-2.5 border border-slate-700/80 rounded-xl bg-slate-950 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                  placeholder="demo@darukaa.earth"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3.5 py-2.5 border border-slate-700/80 rounded-xl bg-slate-950 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center space-x-2 py-3 px-4 border border-transparent text-xs font-bold rounded-xl text-slate-950 bg-emerald-400 hover:bg-emerald-300 focus:outline-none transition shadow-lg shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In to Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center text-xs text-slate-400 pt-2 border-t border-slate-800">
          Don't have an account?{' '}
          <Link to="/register" className="text-emerald-400 hover:underline font-semibold">
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
}