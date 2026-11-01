// src/features/admin/AdminCommandCenter.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { dashboardService } from '@/services/dashboardService';
import {
  ROOMS,
  FACULTY,
  SESSIONS,
  BOOKINGS,
  SPECTRA_EVENTS,
  MIDSEM_EXAMS,
  ANALYTICS,
  PRIORITY_RULES
} from '@/data/demoData';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import {
  Building2,
  CalendarDays,
  FileCheck2,
  AlertTriangle,
  Users,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Activity,
  CheckCircle2,
  XCircle,
  HelpCircle,
  PlayCircle,
  Clock,
  ShieldAlert,
  Layers,
  ChevronRight,
  ArrowUpRight
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  StatusBadge,
  PageHeader,
  DemoBanner
} from '@/components/common';
import { useToast } from '@/components/common/Toaster';
import { useBookingStore } from '@/store/bookingStore';

export default function AdminCommandCenter() {
  const navigate = useNavigate();
  const toast = useToast();
  const { bookings, approveBooking, rejectBooking } = useBookingStore();

  const [hoveredFaculty, setHoveredFaculty] = useState(null);
  const [deanMetrics, setDeanMetrics] = useState(null);
  const [livePendingRequests, setLivePendingRequests] = useState([]);
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const resp = await dashboardService.getDeanDashboard();
        if (resp.data) {
          setDeanMetrics(resp.data.metrics);
          setLivePendingRequests(resp.data.pending_requests || []);
          setIsDemoMode(resp.demo);
        }
      } catch (e) {
        console.warn('Could not load live dean dashboard:', e);
      }
    }
    loadData();
  }, []);

  // Quick stats
  const totalRooms = deanMetrics?.total_rooms ?? ROOMS.length; // 27
  const availableRooms = deanMetrics?.available_rooms ?? ROOMS.filter((r) => r.status === 'available').length;
  const occupiedRooms = deanMetrics?.occupied_rooms ?? ROOMS.filter((r) => r.status === 'occupied').length;
  const partialRooms = ROOMS.filter((r) => r.status === 'partial').length;
  const totalFaculty = FACULTY.length; // 40
  const availableFaculty = deanMetrics
    ? Math.round((deanMetrics.faculty_availability_rate || 0.88) * totalFaculty)
    : FACULTY.filter((f) => f.available).length;
  const pendingSpectra = SPECTRA_EVENTS.filter((e) => e.status === 'pending').length;
  const pendingApprovalsCount = deanMetrics?.pending_approvals ?? (pendingSpectra + 2);
  const conflictsCount = deanMetrics?.current_conflicts ?? 2; // ME040 and ME041 exam clash
  const todaySessionsCount = deanMetrics?.today_scheduled_sessions ?? 189;

  const handleQuickApprove = async (id, title) => {
    const item = livePendingRequests.find((r) => r.id === id) || bookings.find((b) => b.id === id);
    const room = (item?.attendance && item.attendance > 150) ? 'AUD' : (item?.requested_room || 'LH-1');
    const placement = {
      room_id: room,
      day: 'MON',
      start_period: 6,
      end_period: 7,
      reason: 'Approved via Executive Command Center',
    };
    try {
      await approveBooking(id, placement);
      toast.success(`Booking "${title}" approved successfully`);
      setLivePendingRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      toast.error(e.message || 'Approval failed');
    }
  };

  const handleQuickReject = async (id, title) => {
    try {
      await rejectBooking(id, 'Resource prioritised for academic schedule');
      toast.info(`Booking "${title}" rejected.`);
      setLivePendingRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      toast.error(e.message || 'Rejection failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Institutional Command Center"
        subtitle="Dean's Office Executive View — Real-time campus telemetry, timetable status, and constraint monitor"
        badge={
          <Badge variant="blue" size="md" dot>
            CAMPUS SOLVER ACTIVE
          </Badge>
        }
      >
        <Button
          variant="primary"
          onClick={() => navigate('/admin/timetable/generate')}
          icon={Sparkles}
        >
          Generate Weekly Timetable
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate('/campus')}
          icon={Building2}
        >
          3D Campus View
        </Button>
      </PageHeader>

      {/* 5 Core Executive KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1 */}
        <Card className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider">Campus Venues</span>
            <Building2 className="w-4 h-4 text-[#B8F36B]" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-slate-100">{totalRooms} Rooms</div>
            <div className="text-xs text-emerald-400 font-medium mt-1">
              {availableRooms} Available • {occupiedRooms} Occupied
            </div>
          </div>
          <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800">
            {partialRooms} partially occupied
          </div>
        </Card>

        {/* KPI 2 */}
        <Card className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider">Active Sessions</span>
            <CalendarDays className="w-4 h-4 text-teal-400" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-slate-100">{todaySessionsCount} Sessions</div>
            <div className="text-xs text-teal-400 font-medium mt-1">
              100% Scheduled by Solver
            </div>
          </div>
          <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800">
            14 Student Groups • 62 Courses
          </div>
        </Card>

        {/* KPI 3 */}
        <Card className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider">Pending Approvals</span>
            <FileCheck2 className="w-4 h-4 text-purple-400" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-purple-400">
              {pendingApprovalsCount} Requests
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {pendingSpectra} Spectra • {Math.max(0, pendingApprovalsCount - pendingSpectra)} Regular
            </div>
          </div>
          <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800">
            Requires Dean Authorization
          </div>
        </Card>

        {/* KPI 4 */}
        <Card className="p-4 flex flex-col justify-between border-red-500/30 bg-red-950/10">
          <div className="flex items-center justify-between text-xs text-red-400">
            <span className="font-semibold uppercase tracking-wider">Conflicts Detected</span>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-red-400">{conflictsCount} Clashes</div>
            <div className="text-xs text-red-300 mt-1">
              Midsem Exam Venue Overlap
            </div>
          </div>
          <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800">
            Room SH-1 (Nov 25)
          </div>
        </Card>

        {/* KPI 5 */}
        <Card className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider">Faculty Active</span>
            <Users className="w-4 h-4 text-[#B8F36B]" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-slate-100">
              {availableFaculty}/{totalFaculty}
            </div>
            <div className="text-xs text-emerald-400 mt-1">
              {Math.round((availableFaculty / totalFaculty) * 100)}% Available Today
            </div>
          </div>
          <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800">
            {totalFaculty - availableFaculty} on conference/leave
          </div>
        </Card>
      </div>

      {/* Row 2: Live Conflict Monitor & Pending Approvals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Conflict Monitor */}
        <Card className="p-5 border-red-500/30 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-400" />
                Live Constraint Conflict Monitor
              </h3>
              <Badge variant="red" size="sm">
                2 Critical
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Hard constraints violated in current schedule draft:
            </p>

            <div className="space-y-3">
              <div className="p-3 bg-red-950/30 border border-red-500/30 rounded-xl text-xs space-y-1">
                <div className="flex items-center justify-between font-bold text-red-300">
                  <span>CLASH: CS601 vs EC401 Midsem</span>
                  <span className="text-[10px] text-red-400">Nov 25, 09:00</span>
                </div>
                <p className="text-slate-300 text-[11px]">
                  Both exams scheduled in <strong className="text-white">Seminar Hall 1 (SH-1)</strong> at the identical timeslot.
                </p>
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-[10px] text-teal-400">Suggested: Move EC401 to SH-2</span>
                  <Link
                    to="/admin/midsem"
                    className="text-[#B8F36B] hover:text-[#B8F36B] font-semibold text-[11px]"
                  >
                    Resolve →
                  </Link>
                </div>
              </div>

              <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl text-xs space-y-1">
                <div className="flex items-center justify-between font-bold text-amber-300">
                  <span>DISRUPTION: F003 Conference Leave</span>
                  <span className="text-[10px] text-amber-400">6 Sessions</span>
                </div>
                <p className="text-slate-300 text-[11px]">
                  Prof. Amit Patel marked unavailable Oct 31 – Nov 5. Sessions need automated repair.
                </p>
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">Repair proposal generated</span>
                  <Link
                    to="/admin/timetable/compare"
                    className="text-amber-400 hover:text-amber-300 font-semibold text-[11px]"
                  >
                    View Diff →
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-right">
            <Link
              to="/admin/disruptions"
              className="text-xs text-[#B8F36B] hover:text-[#B8F36B] font-semibold inline-flex items-center gap-1"
            >
              Manage all disruptions <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card>

        {/* Room Utilisation by Building Chart */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#B8F36B]" />
                Venue Utilisation by Academic Block
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">AVG 72%</span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Real-time load across lecture halls, labs, and auditoriums
            </p>

            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ANALYTICS.roomUtilisation}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="name"
                    stroke="#64748b"
                    fontSize={10}
                    tickFormatter={(val) => val.split(' ')[0]}
                  />
                  <YAxis stroke="#64748b" fontSize={10} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#090E1A',
                      borderColor: '#1E293B',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: '#F8FAFC',
                    }}
                  />
                  <Bar dataKey="utilisation" fill="#6366F1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-2 text-right">
            <Link
              to="/admin/analytics"
              className="text-xs text-[#B8F36B] hover:text-[#B8F36B] font-semibold inline-flex items-center gap-1"
            >
              Detailed Analytics <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card>

        {/* Pending Approvals Quick Queue */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-purple-400" />
                Dean's Approval Queue
              </h3>
              <Badge variant="purple" size="sm">
                Action Required
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Spectra event requests and extra class bookings awaiting review:
            </p>

            <div className="space-y-3">
              {livePendingRequests.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 bg-slate-900/40 rounded-xl">
                  No pending requests requiring decision.
                </div>
              ) : (
                livePendingRequests.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    className="p-3 bg-slate-900/80 border border-slate-700/60 rounded-xl space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-slate-100">{event.title}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {event.requester} • {event.requested_room || 'Venue TBD'}
                        </div>
                      </div>
                      <Badge variant="amber" size="sm">
                        Pending
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
                      <Button
                        variant="emerald"
                        size="sm"
                        className="flex-1 text-[11px] py-1"
                        onClick={() => handleQuickApprove(event.id, event.title)}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        className="flex-1 text-[11px] py-1"
                        onClick={() => handleQuickReject(event.id, event.title)}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-right">
            <Link
              to="/approvals"
              className="text-xs text-[#B8F36B] hover:text-[#B8F36B] font-semibold inline-flex items-center gap-1"
            >
              Open Approvals Manager <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card>
      </div>

      {/* Row 3: Weekly Session Load & Session Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-100">
                Weekly Session Load Distribution
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Total hours scheduled across Monday through Friday
              </p>
            </div>
            <Badge variant="blue" size="sm">
              5 Working Days
            </Badge>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ANALYTICS.weeklyLoad}>
                <defs>
                  <linearGradient id="loadColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#090E1A',
                    borderColor: '#1E293B',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#F8FAFC',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="sessions"
                  stroke="#6366F1"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#loadColor)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Session Type Breakdown PieChart */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-100 mb-1">
              Curriculum Session Split
            </h3>
            <p className="text-xs text-slate-400 mb-3">Lectures, Tutorials, Labs</p>

            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ANALYTICS.sessionTypes}
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {ANALYTICS.sessionTypes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-800 text-xs">
              {ANALYTICS.sessionTypes.map((t) => (
                <div key={t.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: t.color }}
                    />
                    <span className="text-slate-300">{t.name}</span>
                  </div>
                  <span className="font-bold text-slate-100">{t.value} hrs</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Row 4: 40 Faculty Availability Live Telemetry Grid */}
      <Card className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              <Users className="w-4 h-4 text-[#B8F36B]" />
              Faculty Availability Matrix (40 Faculty Members)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live status for clash prevention and timetable generation
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Available ({availableFaculty})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span>Unavailable ({totalFaculty - availableFaculty})</span>
            </div>
          </div>
        </div>

        {/* 40 Faculty Dots */}
        <div className="grid grid-cols-4 sm:grid-cols-8 md:grid-cols-10 gap-2">
          {FACULTY.map((f) => (
            <div
              key={f.id}
              onMouseEnter={() => setHoveredFaculty(f)}
              onMouseLeave={() => setHoveredFaculty(null)}
              className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                f.available
                  ? 'bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-400 hover:scale-105'
                  : 'bg-red-950/20 border-red-500/30 hover:border-red-400 hover:scale-105'
              }`}
            >
              <div
                className={`w-3 h-3 rounded-full mx-auto mb-1.5 ${
                  f.available ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-red-500'
                }`}
              />
              <div className="text-[10px] font-bold text-slate-200 truncate">
                {f.id}
              </div>
              <div className="text-[9px] text-slate-400 truncate">{f.dept}</div>
            </div>
          ))}
        </div>

        {/* Hovered faculty inspector info */}
        {hoveredFaculty && (
          <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-xl text-xs flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="font-bold text-slate-100">{hoveredFaculty.name}</div>
              <span className="text-slate-400">({hoveredFaculty.designation})</span>
              <Badge variant="blue" size="sm">
                Dept: {hoveredFaculty.dept}
              </Badge>
            </div>
            <div>
              {hoveredFaculty.available ? (
                <span className="text-emerald-400 font-semibold">
                  ✓ Available for scheduled sessions
                </span>
              ) : (
                <span className="text-red-400 font-semibold">
                  ✗ Unavailable: {hoveredFaculty.unavailableReason || 'Leave'}
                </span>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Row 5: Flagship Quick Action Launcher */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => navigate('/admin/timetable/generate')}
          className="p-5 rounded-2xl bg-gradient-to-br from-blue-900/40 to-slate-900 border border-[#B8F36B]/30 hover:border-[#B8F36B] cursor-pointer transition-all duration-200 group flex items-center justify-between"
        >
          <div>
            <h4 className="font-bold text-slate-100 group-hover:text-[#B8F36B]">
              Timetable Workspace
            </h4>
            <p className="text-xs text-slate-400 mt-1">CP-SAT solver triggers</p>
          </div>
          <ArrowRight className="w-5 h-5 text-[#B8F36B] group-hover:translate-x-1 transition-transform" />
        </div>

        <div
          onClick={() => navigate('/admin/midsem')}
          className="p-5 rounded-2xl bg-gradient-to-br from-teal-900/40 to-slate-900 border border-teal-500/30 hover:border-teal-500 cursor-pointer transition-all duration-200 group flex items-center justify-between"
        >
          <div>
            <h4 className="font-bold text-slate-100 group-hover:text-teal-300">
              Midsem Exam Scheduler
            </h4>
            <p className="text-xs text-slate-400 mt-1">41 exams & effective seating</p>
          </div>
          <ArrowRight className="w-5 h-5 text-teal-400 group-hover:translate-x-1 transition-transform" />
        </div>

        <div
          onClick={() => navigate('/admin/spectra')}
          className="p-5 rounded-2xl bg-gradient-to-br from-purple-900/40 to-slate-900 border border-purple-500/30 hover:border-purple-500 cursor-pointer transition-all duration-200 group flex items-center justify-between"
        >
          <div>
            <h4 className="font-bold text-slate-100 group-hover:text-purple-300">
              Spectra Management
            </h4>
            <p className="text-xs text-slate-400 mt-1">Priority rules & venues</p>
          </div>
          <ArrowRight className="w-5 h-5 text-purple-400 group-hover:translate-x-1 transition-transform" />
        </div>

        <div
          onClick={() => navigate('/admin/data')}
          className="p-5 rounded-2xl bg-gradient-to-br from-[#161B18] to-[#121614] border border-[#B8F36B]/30 hover:border-indigo-500 cursor-pointer transition-all duration-200 group flex items-center justify-between"
        >
          <div>
            <h4 className="font-bold text-slate-100 group-hover:text-[#B8F36B]">
              Dataset Import / Export
            </h4>
            <p className="text-xs text-slate-400 mt-1">schedule.json sync</p>
          </div>
          <ArrowRight className="w-5 h-5 text-[#B8F36B] group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </div>
  );
}
