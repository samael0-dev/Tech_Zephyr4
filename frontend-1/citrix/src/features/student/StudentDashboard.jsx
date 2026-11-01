// src/features/student/StudentDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { dashboardService } from '@/services/dashboardService';
import { timetableService } from '@/services/timetableService';
import {
  CalendarDays,
  Sparkles,
  Building2,
  Clock,
  ArrowRight,
  BookOpen,
  CalendarRange,
  Boxes,
  AlertCircle,
  RefreshCw,
  Users,
  PartyPopper,
  GraduationCap,
  MapPin,
  CheckCircle2,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  PageHeader,
  Spinner,
  EmptyState,
} from '@/components/common';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [dashboardData, setDashboardData] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await dashboardService.getStudentDashboard();
      if (!res?.data) {
        throw new Error('Unable to retrieve student dashboard data from server.');
      }
      setDashboardData(res.data);

      // Fetch group-specific sessions if group is available
      const groupId = res.data.student_group || user?.student_group_id;
      if (groupId) {
        try {
          const sessionsRes = await timetableService.getSessions({ group: groupId });
          if (sessionsRes?.data) {
            setSessions(sessionsRes.data);
          }
        } catch (sessErr) {
          console.warn('Could not load group sessions:', sessErr);
        }
      }
    } catch (err) {
      console.error('Failed to load student dashboard:', err);
      setError(err.message || 'An error occurred while loading your dashboard.');
    } finally {
      setLoading(false);
    }
  }, [user?.student_group_id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Determine today's day of week
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayName = days[new Date().getDay()];
  const isWeekend = todayName === 'Sunday' || todayName === 'Saturday';

  // Filter today's sessions
  const todayClasses = sessions.filter(
    (s) => s.day?.toLowerCase() === todayName.toLowerCase() || s.dayAbbr?.toUpperCase() === todayName.slice(0, 3).toUpperCase()
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Spinner size="lg" />
        <p className="text-slate-400 text-sm font-medium tracking-wide">
          Loading student dashboard…
        </p>
      </div>
    );
  }

  const studentName = dashboardData?.student_name || user?.name || 'Rahul Sharma';
  const studentGroup = dashboardData?.student_group || user?.student_group_id || 'Y1-A';
  const department = dashboardData?.department || user?.department || 'CSE';
  const totalCourses = dashboardData?.total_registered_courses ?? 0;
  const weeklySessionsCount = dashboardData?.weekly_sessions_count ?? sessions.length;
  const exams = dashboardData?.exams || [];
  const campusEvents = dashboardData?.campus_events || [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={`Welcome, ${studentName}`}
        subtitle={`Cohort: ${studentGroup} • Department: ${department} • Academic Year 2026`}
        badge={
          <Badge variant="green" size="md" dot>
            STUDENT PORTAL
          </Badge>
        }
      >
        <Button
          variant="outline"
          size="sm"
          icon={Boxes}
          onClick={() => navigate('/campus')}
        >
          3D Campus Map
        </Button>
        <Button
          variant="primary"
          size="sm"
          icon={CalendarDays}
          onClick={() => navigate('/timetable/weekly')}
        >
          Full Timetable
        </Button>
      </PageHeader>

      {/* Sync Error Banner if any */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <h4 className="font-bold text-white text-sm">Dashboard Offline Notice</h4>
              <p className="text-xs text-rose-300/90 mt-0.5">{error}</p>
            </div>
          </div>
          <Button variant="danger" size="sm" icon={RefreshCw} onClick={loadData}>
            Retry Connection
          </Button>
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border-slate-800 bg-slate-900/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Enrolled Cohort
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-white tracking-tight">{studentGroup}</h3>
            <p className="text-xs text-slate-400 mt-1">{department} Curriculum</p>
          </div>
        </Card>

        <Card className="p-5 border-slate-800 bg-slate-900/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Registered Courses
            </span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-white tracking-tight">{totalCourses}</h3>
            <p className="text-xs text-slate-400 mt-1">Curricular Subjects</p>
          </div>
        </Card>

        <Card className="p-5 border-slate-800 bg-slate-900/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Weekly Classes
            </span>
            <div className="p-2 rounded-xl bg-[#B8F36B]/15 text-[#B8F36B] border border-[#B8F36B]/30">
              <CalendarDays className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-white tracking-tight">{weeklySessionsCount}</h3>
            <p className="text-xs text-slate-400 mt-1">Lectures & Labs</p>
          </div>
        </Card>

        <Card className="p-5 border-slate-800 bg-slate-900/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Midsem Exams
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <CalendarRange className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-white tracking-tight">{exams.length}</h3>
            <p className="text-xs text-slate-400 mt-1">Scheduled Roster</p>
          </div>
        </Card>
      </div>

      {/* Main Content Layout: Today's Classes & Exams */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Today's Classes & Schedule */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 border-slate-800 bg-slate-900/50">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-bold text-white">
                  Today's Schedule ({todayName})
                </h2>
              </div>
              <Badge variant={todayClasses.length > 0 ? 'green' : 'slate'} size="sm">
                {todayClasses.length} {todayClasses.length === 1 ? 'Class' : 'Classes'}
              </Badge>
            </div>

            <div className="mt-5">
              {todayClasses.length > 0 ? (
                <div className="space-y-3">
                  {todayClasses.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col items-center justify-center text-emerald-400 font-bold text-xs shrink-0">
                          <span>P{item.start_period || item.period || idx + 1}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-100 text-sm">
                              {item.course || item.course_id}
                            </h4>
                            <Badge variant="teal" size="sm">
                              {item.type || 'Lecture'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-slate-500" />
                              {item.startTime && item.endTime
                                ? `${item.startTime} - ${item.endTime}`
                                : `Period ${item.start_period}`}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-500" />
                              {item.room || item.room_id || 'TBD'}
                            </span>
                            {item.faculty && (
                              <span className="flex items-center gap-1">
                                <Users className="w-3.5 h-3.5 text-slate-500" />
                                {item.faculty}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/campus')}
                        className="self-end sm:self-auto text-xs"
                      >
                        Locate <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={CalendarDays}
                  title={isWeekend ? 'Weekend — No Classes Scheduled' : 'No Classes Scheduled for Today'}
                  description={
                    isWeekend
                      ? 'Enjoy your weekend. Review your full weekly timetable to prepare for upcoming lectures.'
                      : 'You have no scheduled academic lectures or lab sessions for today.'
                  }
                  action={
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={CalendarDays}
                      onClick={() => navigate('/timetable/weekly')}
                    >
                      View Weekly Schedule
                    </Button>
                  }
                />
              )}
            </div>
          </Card>

          {/* Upcoming Fest / Spectra Events */}
          <Card className="p-6 border-slate-800 bg-slate-900/50">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <PartyPopper className="w-5 h-5 text-purple-400" />
                <h2 className="text-lg font-bold text-white">Campus & Fest Events</h2>
              </div>
              <Badge variant="purple" size="sm">
                SPECTRA
              </Badge>
            </div>

            <div className="mt-5">
              {campusEvents.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {campusEvents.map((ev, i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between"
                    >
                      <div>
                        <h4 className="font-semibold text-slate-200 text-sm line-clamp-1">
                          {ev.title}
                        </h4>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                          <span>Day: {ev.day || 'TBD'}</span>
                          <span>•</span>
                          <span>Venue: {ev.room || 'Campus'}</span>
                        </div>
                      </div>
                      <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Period {ev.start_period || 1}</span>
                        <span className="text-purple-400 font-medium">Approved Event</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={PartyPopper}
                  title="No Campus Events Scheduled"
                  description="No approved Spectra or campus events are scheduled for your cohort at this time."
                />
              )}
            </div>
          </Card>
        </div>

        {/* Right 1 Col: Midsem Examination Roster & Quick Actions */}
        <div className="space-y-6">
          {/* Examination Roster */}
          <Card className="p-6 border-slate-800 bg-slate-900/50">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <CalendarRange className="w-5 h-5 text-purple-400" />
                <h2 className="text-base font-bold text-white">Examination Roster</h2>
              </div>
              <Badge variant="purple" size="sm">
                MIDSEM
              </Badge>
            </div>

            <div className="mt-4">
              {exams.length > 0 ? (
                <div className="space-y-3">
                  {exams.map((ex, i) => {
                    const courses = Array.isArray(ex.courses) ? ex.courses.join(', ') : ex.courses;
                    const rooms = Array.isArray(ex.rooms) ? ex.rooms.join(', ') : ex.rooms;
                    return (
                      <div
                        key={ex.exam_id || i}
                        className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/80 space-y-2"
                      >
                        <div className="flex items-start justify-between">
                          <h4 className="font-bold text-slate-200 text-sm">
                            {courses || `Exam ${ex.exam_id}`}
                          </h4>
                          <Badge variant="teal" size="sm">
                            Day {ex.day}
                          </Badge>
                        </div>
                        <div className="text-xs text-slate-400 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Slot / Session:</span>
                            <span className="font-medium text-slate-300">{ex.session || 'Morning'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Examination Hall:</span>
                            <span className="font-semibold text-emerald-400">{rooms || 'Assigned Hall'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={CalendarRange}
                  title="No Upcoming Exams"
                  description="Your cohort has no examinations scheduled in the active roster."
                />
              )}
            </div>
          </Card>

          {/* Quick Actions & AI Assistant Card */}
          <Card className="p-6 border-slate-800 bg-gradient-to-br from-slate-900/90 via-slate-900/50 to-indigo-950/20">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-sky-400" />
              <h3 className="font-bold text-white text-base">Campus AI Copilot</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Ask questions about lecture halls, campus facilities, exam timetables, or event schedules.
            </p>
            <div className="space-y-2">
              <Button
                variant="primary"
                size="sm"
                className="w-full justify-center"
                icon={Sparkles}
                onClick={() => navigate('/assistant')}
              >
                Open AI Assistant
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="w-full justify-center"
                icon={Building2}
                onClick={() => navigate('/campus')}
              >
                3D Campus Explorer
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
