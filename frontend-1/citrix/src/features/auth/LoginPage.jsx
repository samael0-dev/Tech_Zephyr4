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
  ShieldCheck,
  User,
  UserPlus,
  LogIn,
  BookOpen
} from 'lucide-react';
import { Button, Badge } from '@/components/common';
import { useToast } from '@/components/common/Toaster';

export default function LoginPage() {
  const navigate = useNavigate();
  const { loginWithCredentials, loginWithDemo, signup } = useAuthStore();
  const toast = useToast();

  const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Signup fields
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupRole, setSignupRole] = useState('student');
  const [signupDept, setSignupDept] = useState('CSE');

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

  const handleManualSignup = async (e) => {
    e.preventDefault();
    if (!signupName.trim()) {
      toast.error('Please enter your full name');
      return;
    }
    if (!signupEmail.trim()) {
      toast.error('Please enter a valid institutional email');
      return;
    }
    if (!signupPassword || signupPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setSubmitting(true);
    try {
      const createdUser = await signup({
        name: signupName.trim(),
        email: signupEmail.trim(),
        role: signupRole,
        department: signupDept.trim() || 'CSE',
        password: signupPassword,
      });

      toast.success(`Account registered! Welcome to CITRIX, ${createdUser.name}`);
      routeForRole(createdUser.role);
    } catch (err) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  const prefillAccount = (userEmail, userPass) => {
    setEmail(userEmail);
    setPassword(userPass);
    toast.info(`Filled credentials for ${userEmail}`);
  };

  const roleStyles = {
    admin: {
      border: 'hover:border-[#B8F36B]/60',
      badge: 'blue',
      glow: 'hover:shadow-[0_0_25px_-5px_rgba(184,243,107,0.25)]',
      tag: "Master Institutional Control",
      avatarBg: "bg-[#161B18] border border-[#1F2420] text-[#B8F36B]",
      badgeStyle: "bg-[#B8F36B]/15 text-[#B8F36B] border border-[#B8F36B]/30",
    },
    coordinator: {
      border: 'hover:border-[#007A64]/70',
      badge: 'teal',
      glow: 'hover:shadow-[0_0_25px_-5px_rgba(0,122,100,0.3)]',
      tag: "Department Timetable & Labs",
      avatarBg: "bg-[#007A64] text-white",
      badgeStyle: "bg-[#007A64]/20 text-[#10B981] border border-[#007A64]/40",
    },
    faculty: {
      border: 'hover:border-[#10B981]/60',
      badge: 'green',
      glow: 'hover:shadow-[0_0_25px_-5px_rgba(16,185,129,0.25)]',
      tag: "Personal Timetable & AI Assistant",
      avatarBg: "bg-[#161B18] border border-[#1F2420] text-slate-200",
      badgeStyle: "bg-[#1F2420] text-[#9AA19C] border border-[#2D3E32]",
    },
    club: {
      border: 'hover:border-amber-500/60',
      badge: 'amber',
      glow: 'hover:shadow-[0_0_25px_-5px_rgba(245,158,11,0.25)]',
      tag: "Spectra & Venue Booking",
      avatarBg: "bg-[#10B981] text-[#080A09]",
      badgeStyle: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
    },
    student: {
      border: 'hover:border-[#B8F36B]/50',
      badge: 'green',
      glow: 'hover:shadow-[0_0_25px_-5px_rgba(184,243,107,0.2)]',
      tag: "Cohort Timetable & Exams",
      avatarBg: "bg-[#0B132B] text-[#B8F36B]",
      badgeStyle: "bg-[#B8F36B]/10 text-[#B8F36B] border border-[#B8F36B]/25",
    },
  };

  return (
    <div className="min-h-screen bg-[#080A09] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-sans">
      {/* Background ambient decorative glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[520px] h-[520px] rounded-full bg-[#B8F36B]/8 blur-[160px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[520px] h-[520px] rounded-full bg-[#007A64]/10 blur-[160px] pointer-events-none" />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, #B8F36B 1px, transparent 0)',
          backgroundSize: '36px 36px',
        }}
      />

      <div className="w-full max-w-5xl z-10 space-y-8">
        {/* Brand Header matching reference images */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#121614] border border-[#1F2420]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#B8F36B] animate-pulse" />
            <span className="text-[11px] font-mono font-semibold text-[#9AA19C] tracking-widest uppercase">
              CITRIX • CAMPUSOS
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white flex items-center justify-center gap-2.5">
            <span>CITRIX</span>
            <span className="text-[#B8F36B]">CampusOS</span>
          </h1>
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-[#777D78] font-bold">
            ONE CAMPUS. ONE SYSTEM. ZERO CLASHES.
          </p>
          <p className="text-xs sm:text-sm text-[#9AA19C] max-w-xl mx-auto leading-relaxed">
            Intelligent 3D campus scheduling, conflict resolution, CP-SAT timetable synthesis, and natural language venue management.
          </p>
        </div>

        {/* 5 Demo Roles Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-[#B8F36B]" />
              Select Role for Instant Demo Access
            </h2>
            <span className="text-xs text-[#777D78]">Click any card to sign in</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
            {DEMO_ACCOUNTS.map((account) => {
              const style = roleStyles[account.role] || roleStyles.student;
              const isLoading = loadingRole === account.id;

              return (
                <div
                  key={account.id}
                  onClick={() => handleDemoSelect(account)}
                  className={`group relative bg-[#121614] hover:bg-[#161B18] border border-[#1F2420] ${style.border} rounded-2xl p-5 cursor-pointer transition-all duration-300 shadow-xl ${style.glow} flex flex-col justify-between`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-base shadow-md ${style.avatarBg}`}
                      >
                        {account.avatar}
                      </div>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${style.badgeStyle}`}>
                        {account.role}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold text-white transition-colors text-base">
                        {account.name}
                      </h3>
                      <p className="text-xs text-[#777D78] mt-0.5 line-clamp-1">
                        {account.designation}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[#1F2420] text-[11px] text-[#9AA19C] leading-snug">
                      <span className="text-[#777D78] font-medium">Scope: </span>
                      {style.tag}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#1F2420] flex items-center justify-between text-xs font-semibold text-[#B8F36B] group-hover:text-[#A6E854] transition-colors">
                    <span>{isLoading ? 'Accessing...' : 'Enter Dashboard'}</span>
                    <ArrowRight className="w-4 h-4 text-[#B8F36B] group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Credentials Authentication & Registration Card */}
        <div className="bg-[#121614] border border-[#1F2420] rounded-2xl p-6 backdrop-blur-md max-w-lg mx-auto shadow-2xl">
          {/* Tabs: Sign In vs Sign Up */}
          <div className="flex items-center p-1 bg-[#080A09] rounded-xl border border-[#1F2420] mb-6">
            <button
              type="button"
              onClick={() => setAuthMode('login')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${
                authMode === 'login'
                  ? 'bg-[#B8F36B] text-[#101110] shadow-md'
                  : 'text-[#9AA19C] hover:text-slate-200'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('signup')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${
                authMode === 'signup'
                  ? 'bg-[#B8F36B] text-[#101110] shadow-md'
                  : 'text-[#9AA19C] hover:text-slate-200'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Create Account
            </button>
          </div>

          {authMode === 'login' ? (
            /* Login Form */
            <form onSubmit={handleManualLogin} className="space-y-4">
              <div className="text-center mb-3">
                <h3 className="text-sm font-bold text-white">Or Sign In with Credentials</h3>
                <p className="text-xs text-[#777D78] mt-0.5">
                  Production accounts are authenticated through backend OAuth / SSO
                </p>
              </div>

              {/* Quick credential chips */}
              <div className="space-y-1.5 pb-1">
                <span className="text-[10px] font-semibold text-[#777D78] uppercase tracking-wider block">
                  Quick Fill Test Credentials:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => prefillAccount('dean@cit.edu', 'password123')}
                    className="px-2 py-1 bg-[#161B18] border border-[#1F2420] hover:border-[#B8F36B]/50 rounded text-[10px] text-[#B8F36B] font-medium transition-colors"
                  >
                    Dean (Admin)
                  </button>
                  <button
                    type="button"
                    onClick={() => prefillAccount('coordinator.cse@cit.edu', 'password123')}
                    className="px-2 py-1 bg-[#161B18] border border-[#1F2420] hover:border-[#007A64]/70 rounded text-[10px] text-[#10B981] font-medium transition-colors"
                  >
                    Coordinator (CSE)
                  </button>
                  <button
                    type="button"
                    onClick={() => prefillAccount('f01@cit.edu', 'password123')}
                    className="px-2 py-1 bg-[#161B18] border border-[#1F2420] hover:border-[#10B981]/50 rounded text-[10px] text-slate-300 font-medium transition-colors"
                  >
                    Faculty (CSE)
                  </button>
                  <button
                    type="button"
                    onClick={() => prefillAccount('coding@cit.edu', 'password123')}
                    className="px-2 py-1 bg-[#161B18] border border-[#1F2420] hover:border-amber-500/50 rounded text-[10px] text-amber-300 font-medium transition-colors"
                  >
                    Club (Coding)
                  </button>
                  <button
                    type="button"
                    onClick={() => prefillAccount('student.y1a@cit.edu', 'password123')}
                    className="px-2 py-1 bg-[#161B18] border border-[#1F2420] hover:border-[#B8F36B]/50 rounded text-[10px] text-[#B8F36B] font-medium transition-colors"
                  >
                    Student (Y1-A)
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-semibold">CIT Email / Username</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#777D78]" />
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. dean@cit.ac.in"
                    className="w-full pl-9 pr-3 py-2.5 bg-[#080A09] border border-[#1F2420] rounded-xl text-xs sm:text-sm text-slate-100 placeholder-[#777D78] focus:outline-none focus:border-[#B8F36B] focus:ring-1 focus:ring-[#B8F36B]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-semibold">Password</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#777D78]" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-3 py-2.5 bg-[#080A09] border border-[#1F2420] rounded-xl text-xs sm:text-sm text-slate-100 placeholder-[#777D78] focus:outline-none focus:border-[#B8F36B] focus:ring-1 focus:ring-[#B8F36B]"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                loading={submitting}
                className="w-full py-3 text-xs font-bold"
              >
                Sign In to Platform
              </Button>

              <div className="text-center pt-2">
                <span className="text-xs text-[#777D78]">
                  New to CITRIX?{' '}
                  <button
                    type="button"
                    onClick={() => setAuthMode('signup')}
                    className="text-[#B8F36B] hover:text-[#A6E854] font-semibold underline underline-offset-2 ml-1"
                  >
                    Create an institutional account
                  </button>
                </span>
              </div>
            </form>
          ) : (
            /* Sign Up Form */
            <form onSubmit={handleManualSignup} className="space-y-3.5">
              <div className="text-center mb-2">
                <h3 className="text-sm font-bold text-white">Create Institutional Account</h3>
                <p className="text-xs text-[#777D78] mt-0.5">
                  Register your campus identity to obtain tailored timetable and venue access
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-semibold">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#777D78]" />
                  <input
                    type="text"
                    required
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    placeholder="e.g. Dr. Ananya Das / Rohit Sharma"
                    className="w-full pl-9 pr-3 py-2 bg-[#080A09] border border-[#1F2420] rounded-xl text-xs sm:text-sm text-slate-100 placeholder-[#777D78] focus:outline-none focus:border-[#B8F36B] focus:ring-1 focus:ring-[#B8F36B]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-semibold">Institutional Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#777D78]" />
                  <input
                    type="email"
                    required
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="e.g. ananya.das@cit.edu"
                    className="w-full pl-9 pr-3 py-2 bg-[#080A09] border border-[#1F2420] rounded-xl text-xs sm:text-sm text-slate-100 placeholder-[#777D78] focus:outline-none focus:border-[#B8F36B] focus:ring-1 focus:ring-[#B8F36B]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-300 font-semibold">Campus Role</label>
                  <select
                    value={signupRole}
                    onChange={(e) => {
                      setSignupRole(e.target.value);
                      if (e.target.value === 'admin' && signupDept === 'CSE') {
                        setSignupDept('ADMIN');
                      }
                    }}
                    className="w-full px-3 py-2 bg-[#080A09] border border-[#1F2420] rounded-xl text-xs text-slate-100 focus:outline-none focus:border-[#B8F36B] focus:ring-1 focus:ring-[#B8F36B]"
                  >
                    <option value="admin">Dean / Academic Affairs (Admin)</option>
                    <option value="coordinator">Department Coordinator</option>
                    <option value="faculty">Faculty Member</option>
                    <option value="club">Club Representative</option>
                    <option value="student">Student</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-300 font-semibold">Department / Cohort</label>
                  <input
                    type="text"
                    value={signupDept}
                    onChange={(e) => setSignupDept(e.target.value)}
                    placeholder="e.g. CSE or Y1-A"
                    className="w-full px-3 py-2 bg-[#080A09] border border-[#1F2420] rounded-xl text-xs text-slate-100 focus:outline-none focus:border-[#B8F36B] focus:ring-1 focus:ring-[#B8F36B]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-semibold">Create Password</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#777D78]" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full pl-9 pr-3 py-2 bg-[#080A09] border border-[#1F2420] rounded-xl text-xs sm:text-sm text-slate-100 placeholder-[#777D78] focus:outline-none focus:border-[#B8F36B] focus:ring-1 focus:ring-[#B8F36B]"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                loading={submitting}
                className="w-full py-3 text-xs font-bold mt-1"
              >
                Register &amp; Access Workspace
              </Button>

              <div className="text-center pt-2">
                <span className="text-xs text-[#777D78]">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setAuthMode('login')}
                    className="text-[#B8F36B] hover:text-[#A6E854] font-semibold underline underline-offset-2 ml-1"
                  >
                    Sign In
                  </button>
                </span>
              </div>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-[#777D78] pt-6 border-t border-[#1F2420] gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#9AA19C]" />
            <span>Chilika Institute of Technology Campus Operations</span>
          </div>
          <div>
            <span>Backend Integration: OAuth Bearer JWT • CP-SAT API Contract Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
}
