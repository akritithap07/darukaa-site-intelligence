import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register, extractErrorMessage } from '../api/client';
import { Globe, Lock, Mail, ArrowRight, AlertCircle, User } from 'lucide-react';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullPath, setFullPath] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register({ email, password, full_name: fullPath });
      navigate('/login');
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to register account.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center px-4">
      <div className="max-w-md w-full space-y-8 bg-slate-800 p-8 rounded-xl border border-slate-700 shadow-2xl">
        <div className="text-center">
          <div className="flex justify-center items-center space-x-2 text-emerald-400 mb-2">
            <Globe className="w-8 h-8 text-emerald-500" />
            <span className="text-xl font-bold tracking-wider text-white">DARUKAA</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white">Create new account</h2>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{typeof error === 'string' ? error : 'Registration failed.'}</span>
          </div>
        )}

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type="text"
                  required
                  value={fullPath}
                  onChange={(e) => setFullPath(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-700 rounded-md bg-slate-900 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500"
                  placeholder="Jane Doe"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-700 rounded-md bg-slate-900 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500"
                  placeholder="user@darukaa.earth"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-700 rounded-md bg-slate-900 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center space-x-2 py-2.5 px-4 border border-transparent text-xs font-semibold rounded-md text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none transition disabled:opacity-50"
          >
            {loading ? (
              <span>Registering...</span>
            ) : (
              <>
                <span>Create Account</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center text-xs text-slate-400">
          Already registered?{' '}
          <Link to="/login" className="text-emerald-400 hover:underline font-medium">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}