import React, { useState, useEffect } from 'react';
import { Server, CheckCircle2, AlertCircle, RefreshCw, Globe, ExternalLink, X } from 'lucide-react';
import { getBaseUrl, getCustomApiUrl, setCustomApiUrl, testBackendHealth } from '@/services/apiClient';
import { useAuthStore } from '@/store/authStore';

export default function BackendConfigModal({ isOpen, onClose }) {
  const [urlInput, setUrlInput] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const { user, loginWithDemo } = useAuthStore();

  useEffect(() => {
    if (isOpen) {
      setUrlInput(getCustomApiUrl() || '');
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentResolvedUrl = getBaseUrl();

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const target = urlInput.trim() || currentResolvedUrl;
    const res = await testBackendHealth(target);
    setTesting(false);
    setTestResult(res);
  };

  const handleSave = async () => {
    const trimmed = urlInput.trim();
    setCustomApiUrl(trimmed);
    
    // Automatically re-authenticate or refresh user session if a demo account is active
    if (user?.role) {
      try {
        const roleMapping = {
          admin: 'demo-admin',
          faculty: 'demo-faculty',
          student: 'demo-student',
          coordinator: 'demo-coordinator',
          club: 'demo-club',
        };
        const personaId = roleMapping[user.role] || 'demo-admin';
        await loginWithDemo(personaId);
      } catch (err) {
        console.warn('Post-connection auth refresh notice:', err.message);
      }
    }
    
    onClose();
    // Optional reload to refresh all components cleanly
    window.location.reload();
  };

  const handleReset = () => {
    setCustomApiUrl('');
    setUrlInput('');
    setTestResult(null);
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#0F172A] border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Backend API Server Connection</h3>
            <p className="text-xs text-slate-400">
              Configure where the CITRIX frontend connects for live database and AI solver actions
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs">
            <span className="text-slate-400 font-medium">Active API Endpoint:</span>
            <div className="font-mono text-cyan-300 mt-0.5 break-all">
              {currentResolvedUrl}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Custom FastAPI Backend URL (e.g. Render, Railway, or Localhost)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://your-citrix-backend.onrender.com"
                className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
              />
              <button
                type="button"
                onClick={handleTest}
                disabled={testing}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                {testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                Test
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Paste your deployed backend URL. If it does not end with <code className="text-slate-300">/api/v1</code>, it will be added automatically.
            </p>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => setUrlInput('http://127.0.0.1:8000')}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] text-slate-300 transition-colors"
            >
              Set Localhost (127.0.0.1:8000)
            </button>
            {getCustomApiUrl() && (
              <button
                type="button"
                onClick={handleReset}
                className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-[11px] text-rose-300 transition-colors"
              >
                Reset to Default
              </button>
            )}
          </div>

          {/* Test Status Banner */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                testResult.ok
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {testResult.ok ? (
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-400" />
              )}
              <div className="space-y-1">
                <div className="font-semibold">
                  {testResult.ok ? 'Backend Connected Successfully!' : 'Backend Connection Failed'}
                </div>
                {testResult.ok && testResult.data && (
                  <div className="text-[11px] text-emerald-200/80 font-mono">
                    Status: {testResult.data.status} | Version: {testResult.data.version || '1.0.0'}
                  </div>
                )}
                {!testResult.ok && (
                  <div className="text-[11px] text-rose-200/80">
                    {testResult.error || 'The server could not be reached. Ensure your backend service is running and CORS allows requests.'}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Vercel Env Tip */}
          <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-800/40 text-[11px] text-indigo-300/90 leading-relaxed">
            <span className="font-semibold text-indigo-200">Vercel Deployment Tip:</span> To permanently configure this for all users on Vercel without setting it in the browser, go to your <strong>Vercel Project &gt; Settings &gt; Environment Variables</strong>, set <code className="bg-indigo-900/50 px-1 py-0.5 rounded text-white font-mono">VITE_API_URL</code> to your backend URL, and redeploy.
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 transition-all"
          >
            Save & Connect
          </button>
        </div>
      </div>
    </div>
  );
}
