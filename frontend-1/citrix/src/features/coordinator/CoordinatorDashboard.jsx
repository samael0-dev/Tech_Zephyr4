// src/features/coordinator/CoordinatorDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { dashboardService } from '@/services/dashboardService';
import {
  ROOMS,
  FACULTY,
  SESSIONS,
  BOOKINGS,
  COURSES
} from '@/data/demoData';
import {
  LayoutDashboard,
  Building,
  Users,
  CalendarDays,
  FileCheck2,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  Layers,
  FlaskConical
} from 'lucide-react';
import { Badge, Button, Card, PageHeader, DemoBanner, StatusBadge } from '@/components/common';
import { useToast } from '@/components/common/Toaster';

export default function CoordinatorDashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const [deptData, setDeptData] = useState(null);

  const [labRequests, setLabRequests] = useState([
    {
      id: 'REQ-ROBOTICS-01',
      title: 'Robotics Club Workshop',
      room: 'CS Lab 3',
      details: 'Nov 8, 10:00 - 13:00 • 40 Workstations requested',
      status: 'pending',
      requestedBy: 'Robotics Club',
    },
    {
      id: 'REQ-AI-02',
      title: 'ACM AI/ML Hackathon Prep',
      room: 'CS Lab 1',
      details: 'Nov 9, 14:00 - 17:00 • 35 Workstations requested',
      status: 'pending',
      requestedBy: 'ACM Student Chapter',
    },
  ]);

  const handleApproveRequest = (id) => {
    setLabRequests((prev) =>
      prev.map((req) => (req.id === id ? { ...req, status: 'approved' } : req))
    );
    toast.success('Lab access request approved! Venue confirmed.');
  };

  const handleRejectRequest = (id) => {
    setLabRequests((prev) =>
      prev.map((req) => (req.id === id ? { ...req, status: 'rejected' } : req))
    );
    toast.info('Lab access request rejected.');
  };

  const handleResetRequest = (id) => {
    setLabRequests((prev) =>
      prev.map((req) => (req.id === id ? { ...req, status: 'pending' } : req))
    );
  };

  useEffect(() => {
    async function loadData() {
      try {
        const resp = await dashboardService.getCoordinatorDashboard();
        if (resp.data) {
          setDeptData(resp.data);
        }
      } catch (err) {
        console.warn('Could not load live coordinator dashboard:', err);
      }
    }
    loadData();
  }, []);

  const cseRooms = deptData?.department_labs?.length > 0
    ? deptData.department_labs
    : ROOMS.filter((r) => r.building.includes('Academic Block A') || r.building.includes('CS & IT'));
  const cseFaculty = FACULTY.filter((f) => f.dept === 'CSE');
  const cseSessions = SESSIONS.filter(
    (s) => s.group.startsWith('CSE') || s.course.startsWith('CS')
  );

  const pendingLabBookings = deptData?.pending_lab_requests?.length > 0
    ? deptData.pending_lab_requests
    : BOOKINGS.filter((b) => b.room.startsWith('CS-L') && b.status === 'pending');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Department Coordinator Command"
        subtitle="Computer Science & Engineering Department — Lab reservations, faculty teaching matrix, and session approvals"
        badge={
          <Badge variant="teal" size="md">
            CSE DEPARTMENT HUB
          </Badge>
        }
      >
        <Button
          variant="primary"
          onClick={() => navigate('/bookings/new')}
          icon={Layers}
        >
          Book Department Venue
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate('/timetable/weekly')}
          icon={CalendarDays}
        >
          Department Timetable
        </Button>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <span className="text-xs text-slate-400 block uppercase font-semibold">CSE Faculty Active</span>
          <span className="text-2xl font-black text-slate-100 mt-1 block">
            {cseFaculty.filter((f) => f.available).length} / {cseFaculty.length}
          </span>
          <span className="text-[11px] text-emerald-400">
            {cseFaculty.filter((f) => !f.available).length} on conference leave
          </span>
        </Card>

        <Card className="p-4">
          <span className="text-xs text-slate-400 block uppercase font-semibold">Department Venues</span>
          <span className="text-2xl font-black text-slate-100 mt-1 block">
            {cseRooms.length} Classrooms &amp; Labs
          </span>
          <span className="text-[11px] text-teal-400">
            3 High-Performance Computer Labs
          </span>
        </Card>

        <Card className="p-4">
          <span className="text-xs text-slate-400 block uppercase font-semibold">Weekly CSE Sessions</span>
          <span className="text-2xl font-black text-blue-400 mt-1 block">
            {cseSessions.length} Hours
          </span>
          <span className="text-[11px] text-slate-500">
            Across Sem 1, 3, and 5 cohorts
          </span>
        </Card>

        <Card className="p-4 border-purple-500/30">
          <span className="text-xs text-purple-400 block uppercase font-semibold">Lab Approvals Pending</span>
          <span className="text-2xl font-black text-purple-400 mt-1 block">
            {pendingLabBookings.length + 1} Requests
          </span>
          <span className="text-[11px] text-slate-400">
            Robotics &amp; AI Workshops
          </span>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Department Timetable Preview */}
        <div className="lg:col-span-2 space-y-5">
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-100">
                  CSE Department Scheduled Sessions
                </h3>
                <p className="text-xs text-slate-400">
                  Real-time allocations for Monday lectures and laboratory blocks
                </p>
              </div>
              <Link
                to="/timetable/weekly"
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
              >
                Full Schedule <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {cseSessions.slice(0, 6).map((s) => {
                const course = COURSES.find((c) => c.id === s.course);
                const faculty = FACULTY.find((f) => f.id === s.faculty);

                return (
                  <div
                    key={s.id}
                    className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 font-mono font-bold flex flex-col items-center justify-center text-[10px]">
                        <span>{s.startTime}</span>
                        <span className="text-slate-500">{s.endTime}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-100">{s.course}</span>
                          <span className="text-slate-400 font-medium">({course?.name})</span>
                          <Badge variant="blue" size="sm">{s.type}</Badge>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Cohort: {s.group} • Faculty: {faculty?.name || s.faculty}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-bold text-slate-200 block">{s.room}</span>
                      <span className="text-[10px] text-teal-400">{s.day}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right 1 Col: Department Lab Approvals & Faculty Matrix */}
        <div className="space-y-5">
          {/* Lab Booking Approvals */}
          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-purple-400" />
                CSE Lab Access Requests
              </h3>
              <Badge variant="purple" size="sm">
                Coordinator Scope
              </Badge>
            </div>

            <div className="space-y-3 text-xs">
              {labRequests.map((req) => (
                <div
                  key={req.id}
                  className={`p-3 rounded-xl border transition-all ${
                    req.status === 'approved'
                      ? 'bg-emerald-950/20 border-emerald-500/40'
                      : req.status === 'rejected'
                      ? 'bg-rose-950/20 border-rose-500/40 opacity-75'
                      : 'bg-slate-900 border-slate-700/60'
                  } space-y-2`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-bold text-slate-100">{req.title}</div>
                    <Badge
                      variant={
                        req.status === 'approved'
                          ? 'green'
                          : req.status === 'rejected'
                          ? 'red'
                          : 'amber'
                      }
                      size="sm"
                    >
                      {req.room}
                    </Badge>
                  </div>
                  <p className="text-slate-400 text-[11px]">{req.details}</p>

                  {req.status === 'pending' ? (
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        variant="emerald"
                        size="sm"
                        className="flex-1 text-[11px] py-1"
                        onClick={() => handleApproveRequest(req.id)}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        className="flex-1 text-[11px] py-1"
                        onClick={() => handleRejectRequest(req.id)}
                      >
                        Reject
                      </Button>
                    </div>
                  ) : req.status === 'approved' ? (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approved • Lab Allocated
                      </span>
                      <button
                        type="button"
                        onClick={() => handleResetRequest(req.id)}
                        className="text-[10px] text-slate-400 hover:text-slate-200 underline"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-rose-400 font-semibold flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" />
                        Rejected
                      </span>
                      <button
                        type="button"
                        onClick={() => handleResetRequest(req.id)}
                        className="text-[10px] text-slate-400 hover:text-slate-200 underline"
                      >
                        Reconsider
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Department Faculty Availability */}
          <Card className="p-5 space-y-3">
            <h3 className="font-bold text-sm text-slate-100 flex items-center justify-between">
              <span>CSE Faculty Roster</span>
              <span className="text-xs text-slate-400 font-normal">{cseFaculty.length} Professors</span>
            </h3>

            <div className="space-y-2 text-xs">
              {cseFaculty.slice(0, 5).map((f) => (
                <div
                  key={f.id}
                  className="p-2.5 bg-slate-900/60 rounded-lg flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        f.available ? 'bg-emerald-400' : 'bg-red-400'
                      }`}
                    />
                    <span className="font-medium text-slate-200">{f.name}</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {f.available ? 'Teaching' : f.unavailableReason || 'Leave'}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
