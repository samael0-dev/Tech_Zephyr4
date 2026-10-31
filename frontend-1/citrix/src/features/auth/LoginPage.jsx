// src/features/auth/LoginPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { DEMO_ACCOUNTS } from '@/data/demoData';
import {
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Building2,
  Calendar,
  Layers,
  GraduationCap,
  Users,
  Compass,
  CheckCircle2,
  Lock,
  Mail,
  KeyRound,
  ShieldCheck
} from 'lucide-react';
import { Button, Badge } from '@/components/common';
import { useToast } from '@/components/common/Toaster';

export default function LoginPage() {
  const navigate = useNavigate();
  const { loginWithCredentials, loginWithDemo } = useAuthStore();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loadingRole, setLoadingRole] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const routeForRole = (role) => {
    if (role === 'admin') navigate('/admin');
    else if (role === 'coordinator' || role === 'department_coordinator') navigate('/coordinator');
    else if (role === 'faculty') navigate('/faculty');
    else if (role === 'club') navigate('/club');
    else if (role === 'student') navigate('/student');
    else navigate('/campus');
  };

  const handleDemoSelect = async (account) => {
    setLoadingRole(account.id);
    try {
      const loggedUser = await loginWithDemo(account.id);
      toast.success(`Logged in as ${loggedUser.name} (${loggedUser.designation || loggedUser.role})`);
      routeForRole(loggedUser.role);
    } catch (err) {
      toast.error(err.message || 'Authentication failed');
    } finally {
      setLoadingRole(null);
    }
  };

  const handleManualLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter both email/username and password');
      return;
    }
    setSubmitting(true);
    try {
      const loggedUser = await loginWithCredentials(email, password);
      toast.success(`Logged in as ${loggedUser.name} (${loggedUser.role})`);
      routeForRole(loggedUser.role);
    } catch (err) {
      toast.error(err.message || 'Invalid username or password');
    } finally {
      setSubmitting(false);
    }
  };

  const roleStyles = {
    admin: {
      border: 'hover:border-indigo-500/70',
      badge: 'blue',
      glow: 'hover:shadow-indigo-950/50',
      tag: "Master Institutional Control",
    },
    coordinator: {
      border: 'hover:border-cyan-500/70',
      badge: 'teal',
      glow: 'hover:shadow-cyan-950/50',
      tag: "Department Timetable & Labs",
    },
    faculty: {
      border: 'hover:border-purple-500/70',
      badge: 'purple',
      glow: 'hover:shadow-purple-950/50',
      tag: "Personal Timetable & AI Assistant",
    },
    club: {
      border: 'hover:border-amber-500/70',
      badge: 'amber',
      glow: 'hover:shadow-amber-950/50',
      tag: "Spectra & Venue Booking",
    },
    student: {
      border: 'hover:border-emerald-500/70',
      badge: 'green',
      glow: 'hover:shadow-emerald-950/50',
      tag: "Cohort Timetable & Exams",
    },
  };

  return (
    <div className="min-h-screen bg-[#070B14] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-sans">
      {/* Background ambient decorative glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[520px] h-[520px] rounded-full bg-indigo-600/12 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[520px] h-[520px] rounded-full bg-cyan-500/10 blur-[140px] pointer-events-none" />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="w-full max-w-5xl z-10 space-y-8">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center mb-1">
            <img
              src="/favicon.png"
              alt="CITRIX Logo"
              className="w-16 h-16 object-contain drop-shadow-[0_0_20px_rgba(56,189,248,0.35)]"
            />
          </div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/60 shadow-inner">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-[11px] font-bold text-slate-300 tracking-wider uppercase">
              Chilika Institute of Technology • Smart Campus
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white">
            CIT<span className="bg-gradient-to-r from-indigo-400 via-sky-400 to-cyan-300 bg-clip-text text-transparent">RIX</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
            Intelligent 3D campus scheduling, conflict resolution, CP-SAT timetable synthesis, and natural language venue management.
          </p>
        </div>

        {/* 5 Demo Roles Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              Select Role for Instant Demo Access
            </h2>
            <span className="text-xs text-slate-500">Click any card to sign in</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
            {DEMO_ACCOUNTS.map((account) => {
              const style = roleStyles[account.role];
              const isLoading = loadingRole === account.id;

              return (
                <div
                  key={account.id}
                  onClick={() => handleDemoSelect(account)}
                  className={`group relative bg-slate-900/70 hover:bg-slate-900/95 border border-slate-800 ${style.border} rounded-2xl p-5 cursor-pointer transition-all duration-300 shadow-xl ${style.glow} flex flex-col justify-between`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-base shadow-md ${account.color}`}
                      >
                        {account.avatar}
                      </div>
                      <Badge variant={style.badge} size="sm">
                        {account.role}
                      </Badge>
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-100 group-hover:text-white transition-colors text-base">
                        {account.name}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                        {account.designation}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 leading-snug">
                      <span className="text-slate-300 font-medium">Scope: </span>
                      {style.tag}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs font-semibold text-indigo-400 group-hover:text-cyan-300 transition-colors">
                    <span>{isLoading ? 'Accessing...' : 'Enter Dashboard'}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Divider / Manual login area */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md max-w-md mx-auto">
          <div className="text-center mb-5">
            <h3 className="text-sm font-bold text-slate-100">Or Sign In with Credentials</h3>
            <p className="text-xs text-slate-400 mt-1">
              Production accounts are authenticated through backend OAuth / SSO
            </p>
          </div>

          <form onSubmit={handleManualLogin} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-medium">CIT Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. dean@cit.ac.in"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-medium">Password</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
            </div>

            <Button type="submit" variant="primary" className="w-full mt-2">
              Sign In to Platform
            </Button>
          </form>

          <div className="mt-4 text-center">
            <span className="text-[11px] text-slate-500">
              Demo tip: Selecting any demo card above grants immediate authenticated access.
            </span>
          </div>
        </div>

        {/* Footer info */}
        <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 pt-6 border-t border-slate-800/60 gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-400" />
            <span>Chilika Institute of Technology Campus Operations</span>
          </div>
          <div>
            <span>Backend Integration: Mock Adapter v2.1 • CP-SAT API Contract Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
}
