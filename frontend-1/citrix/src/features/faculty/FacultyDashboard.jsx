// src/features/faculty/FacultyDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { dashboardService } from '@/services/dashboardService';
import { timetableService } from '@/services/timetableService';
import { SESSIONS, COURSES, ROOMS, BOOKINGS } from '@/data/demoData';
import {
  CalendarDays,
  Sparkles,
  Building2,
  Clock,
  ArrowRight,
  PlusCircle,
  AlertTriangle,
  Layers,
  BookOpen,
  CheckCircle2,
  Boxes
} from 'lucide-react';
import { Badge, Button, Card, PageHeader, DemoBanner, StatusBadge } from '@/components/common';

export default function FacultyDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [facultyData, setFacultyData] = useState(null);
  const [timetableSessions, setTimetableSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const [dashResp, ttResp] = await Promise.allSettled([
          dashboardService.getFacultyDashboard(),
          timetableService.getSessions({ faculty: user?.faculty_id || 'F01' }),
        ]);

        if (mounted) {
          if (dashResp.status === 'fulfilled' && dashResp.value?.data) {
            setFacultyData(dashResp.value.data);
          }
          if (ttResp.status === 'fulfilled' && ttResp.value?.data?.length > 0) {
            setTimetableSessions(ttResp.value.data);
          }
        }
      } catch (err) {
        console.warn('Could not load faculty dashboard data:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, [user]);

  const facultyId = user?.faculty_id || 'F01';
  const mySessions =
    timetableSessions.length > 0
      ? timetableSessions
      : facultyData?.sessions?.length > 0
      ? facultyData.sessions
      : SESSIONS.filter(
          (s) => s.faculty === facultyId || s.faculty === 'F001' || s.faculty === 'F01'
        );

  const myCourses =
    facultyData?.sessions?.length > 0
      ? Array.from(new Set(facultyData.sessions.map((s) => s.course_id))).map((cid) => {
          const match = COURSES.find((c) => c.id === cid);
          return (
            match || {
              id: cid,
              name: `${cid} Curriculum`,
              credits: 4,
              dept: user?.department || 'CSE',
              type: 'Core',
            }
          );
        })
      : COURSES.filter((c) => c.faculty === facultyId || c.faculty === 'F001');

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Faculty Workspace: ${user?.name || 'Dr. Rajesh Kumar'}`}
        subtitle={`${user?.designation || 'Professor, CSE'} — Teaching timetable, classroom locator, and AI rescheduling assistant`}
        badge={
          <Badge variant="purple" size="md">
            FACULTY PORTAL
          </Badge>
        }
      >
        <Button
          variant="primary"
          onClick={() => navigate('/assistant')}
          icon={Sparkles}
        >
          AI Booking Assistant
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate('/faculty/unavailability')}
          icon={AlertTriangle}
        >
          Report Unavailability
        </Button>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <span className="text-xs text-slate-400 block uppercase font-semibold">Weekly Teaching</span>
          <span className="text-2xl font-black text-slate-100 mt-1 block">
            {facultyData?.total_weekly_hours ? `${facultyData.total_weekly_hours} Hours / Wk` : '8 Hours / Wk'}
          </span>
          <span className="text-[11px] text-teal-400 font-medium">
            {facultyData?.max_hours_per_day ? `Max ${facultyData.max_hours_per_day}h ceiling / day` : 'Within standard ceiling'}
          </span>
        </Card>

        <Card className="p-4">
          <span className="text-xs text-slate-400 block uppercase font-semibold">Assigned Courses</span>
          <span className="text-2xl font-black text-blue-400 mt-1 block">
            {facultyData?.total_courses ? `${facultyData.total_courses} Courses` : `${myCourses.length} Courses`}
          </span>
          <span className="text-[11px] text-slate-500">
            {myCourses.map((c) => c.id).slice(0, 3).join(', ') || 'Curriculum assigned'}
          </span>
        </Card>

        <Card className="p-4">
          <span className="text-xs text-slate-400 block uppercase font-semibold">Primary Buildings</span>
          <span className="text-2xl font-black text-purple-400 mt-1 block">Acad A &amp; B</span>
          <span className="text-[11px] text-slate-500">Highlighted in 3D Campus</span>
        </Card>

        <Card className="p-4">
          <span className="text-xs text-slate-400 block uppercase font-semibold">Active Bookings</span>
          <span className="text-2xl font-black text-emerald-400 mt-1 block">1 Approved</span>
          <span className="text-[11px] text-slate-500">Extra Class A-201 (Nov 9)</span>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Today & Weekly Timetable */}
        <div className="lg:col-span-2 space-y-5">
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-100">
                  My Teaching Sessions Roster
                </h3>
                <p className="text-xs text-slate-400">
                  Generated without clashes by CP-SAT solver
                </p>
              </div>
              <Link
                to="/timetable/weekly"
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
              >
                Full Calendar <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {mySessions.map((s) => {
                const courseCode = s.course || s.course_id || 'Session';
                const course = COURSES.find((c) => c.id === courseCode);
                const roomCode = s.room || s.room_id || 'TBD';
                const room = ROOMS.find((r) => r.id === roomCode);
                const dayText = s.day ? String(s.day) : s.dayAbbr ? String(s.dayAbbr) : 'MON';
                const dayBadge = dayText.slice(0, 3).toUpperCase();
                const timeBadge =
                  s.startTime || (s.start_period ? `P${s.start_period}` : `${s.duration || 1}h`);
                const typeText =
                  s.type || (s.kind ? s.kind.charAt(0).toUpperCase() + s.kind.slice(1) : 'Lecture');
                const groupText =
                  s.group || (Array.isArray(s.groups) ? s.groups.join(', ') : 'All Cohorts');

                return (
                  <div
                    key={s.id || `${courseCode}-${Math.random()}`}
                    className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 font-bold flex flex-col items-center justify-center text-[10px] shrink-0">
                        <span>{dayBadge}</span>
                        <span className="text-slate-300 font-mono text-[9px]">{timeBadge}</span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-100 text-sm">
                            {courseCode}: {course?.name || s.kind || 'Curriculum Session'}
                          </span>
                          <Badge variant="blue" size="sm">{typeText}</Badge>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                          <span>Cohort: <strong className="text-slate-300">{groupText}</strong></span>
                          <span>•</span>
                          <span>
                            {s.startTime && s.endTime
                              ? `${s.startTime} - ${s.endTime}`
                              : s.start_period
                              ? `Period ${s.start_period} (${s.duration || 1}h)`
                              : `${s.duration || 1}h Scheduled Duration`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="font-bold text-slate-100 block">{roomCode}</span>
                        <span className="text-[11px] text-teal-400">
                          {room?.building || (roomCode !== 'TBD' ? 'Campus Block' : 'Slot Allocated')}
                        </span>
                      </div>
                      {roomCode !== 'TBD' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/campus?room=${roomCode}`)}
                          className="text-xs"
                        >
                          Locate 3D
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right 1 Col: Quick Actions & Assigned Courses */}
        <div className="space-y-5">
          {/* Quick Actions Panel */}
          <Card className="p-5 space-y-3">
            <h3 className="font-bold text-sm text-slate-100 uppercase tracking-wider">
              Faculty Workflows
            </h3>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start text-xs text-left"
                onClick={() => navigate('/bookings/new')}
                icon={PlusCircle}
              >
                Request Extra Class Room
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-xs text-left"
                onClick={() => navigate('/assistant')}
                icon={Sparkles}
              >
                Ask AI to Reschedule Lecture
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-xs text-left"
                onClick={() => navigate('/campus')}
                icon={Boxes}
              >
                Explore Campus &amp; Venues
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-xs text-left"
                onClick={() => navigate('/faculty/unavailability')}
                icon={AlertTriangle}
              >
                Submit Leave Notice
              </Button>
            </div>
          </Card>

          {/* Assigned Courses Overview */}
          <Card className="p-5 space-y-3">
            <h3 className="font-bold text-sm text-slate-100">My Curriculum Subjects</h3>
            <div className="space-y-2.5 text-xs">
              {myCourses.map((c) => (
                <div
                  key={c.id}
                  className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-100">{c.id}: {c.name}</span>
                    <Badge variant="teal" size="sm">{c.credits} Credits</Badge>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Department: {c.dept}</span>
                    <span>Format: {c.type}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
