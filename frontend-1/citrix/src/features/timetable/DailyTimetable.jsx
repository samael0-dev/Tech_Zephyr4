// src/features/timetable/DailyTimetable.jsx
import React, { useState, useEffect } from 'react';
import { timetableService } from '@/services/timetableService';
import { SESSIONS, COURSES, FACULTY, ROOMS, STUDENT_GROUPS } from '@/data/demoData';
import {
  Calendar,
  Clock,
  Building,
  GraduationCap,
  Users,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Badge, Button, Card, PageHeader, DemoBanner } from '@/components/common';

export default function DailyTimetable() {
  const [sessions, setSessions] = useState(SESSIONS);
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [selectedCohort, setSelectedCohort] = useState('All');

  useEffect(() => {
    async function loadSessions() {
      try {
        const resp = await timetableService.getSessions();
        if (resp.data && resp.data.length > 0) {
          setSessions(resp.data);
        }
      } catch (err) {
        console.warn('Could not load live sessions:', err);
      }
    }
    loadSessions();
  }, []);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const filteredSessions = sessions.filter((s) => {
    if (s.day !== selectedDay) return false;
    if (selectedCohort !== 'All' && s.group !== selectedCohort && !(s.groups && s.groups.includes(selectedCohort))) return false;
    return true;
  }).sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily Schedule Timeline"
        subtitle={`Chronological class schedule for ${selectedDay}. Track active teaching sessions and venue transitions.`}
        badge={<DemoBanner text="Live Daily Execution Timeline" />}
      >
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
          {days.map((d) => (
            <button
              key={d}
              onClick={() => setSelectedDay(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedDay === d
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {d.slice(0, 3)}
            </button>
          ))}
        </div>
      </PageHeader>

      {/* Cohort Filter */}
      <Card className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-300">Filter Cohort:</label>
          <select
            value={selectedCohort}
            onChange={(e) => setSelectedCohort(e.target.value)}
            className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none"
          >
            <option value="All">All Cohorts (Full Campus Schedule)</option>
            {STUDENT_GROUPS.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <span className="text-xs text-slate-400">
          <strong>{filteredSessions.length}</strong> Sessions on {selectedDay}
        </span>
      </Card>

      {/* Timeline List */}
      <div className="space-y-3">
        {filteredSessions.map((session) => {
          const course = COURSES.find((c) => c.id === session.course);
          const faculty = FACULTY.find((f) => f.id === session.faculty);
          const room = ROOMS.find((r) => r.id === session.room);

          return (
            <Card
              key={session.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-600 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono font-bold flex flex-col items-center justify-center text-xs shrink-0">
                  <span>{session.startTime}</span>
                  <span className="text-[10px] text-slate-500">{session.endTime}</span>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-slate-100">
                      {session.course}: {course?.name}
                    </span>
                    <Badge variant="blue" size="sm">
                      {session.type}
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-3">
                    <span className="flex items-center gap-1">
                      <GraduationCap className="w-3.5 h-3.5 text-slate-500" />
                      Cohort: <strong className="text-slate-300">{session.group}</strong>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      Faculty: <strong className="text-slate-300">{faculty?.name || session.faculty}</strong>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 sm:border-l sm:border-slate-800 sm:pl-4">
                <div className="text-right">
                  <div className="font-bold text-sm text-slate-100">{session.room}</div>
                  <div className="text-[11px] text-teal-400">{room?.building}</div>
                </div>
                <Badge variant="green" size="sm">
                  Active
                </Badge>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
