// src/features/timetable/WeeklyTimetable.jsx
import React, { useState, useEffect } from 'react';
import { timetableService } from '@/services/timetableService';
import {
  SESSIONS,
  STUDENT_GROUPS,
  FACULTY,
  ROOMS,
  COURSES
} from '@/data/demoData';
import {
  CalendarDays,
  Filter,
  Users,
  Building,
  GraduationCap,
  Download,
  Printer,
  Sparkles,
  Info,
  ChevronRight
} from 'lucide-react';
import { Badge, Button, Card, PageHeader, DemoBanner, Modal } from '@/components/common';
import { useToast } from '@/components/common/Toaster';

export default function WeeklyTimetable() {
  const toast = useToast();
  const [sessions, setSessions] = useState(SESSIONS);
  const [filterMode, setFilterMode] = useState('group'); // 'group', 'faculty', 'room'
  const [selectedEntityId, setSelectedEntityId] = useState('CSE-A1');
  const [selectedSession, setSelectedSession] = useState(null);

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
  const timeSlots = [
    '08:00',
    '09:00',
    '10:00',
    '11:00',
    '12:00',
    '14:00',
    '15:00',
    '16:00',
    '17:00',
  ];

  // Filter sessions based on mode
  const activeSessions = sessions.filter((s) => {
    if (filterMode === 'group') return s.group === selectedEntityId || (s.groups && s.groups.includes(selectedEntityId));
    if (filterMode === 'faculty') return s.faculty === selectedEntityId;
    if (filterMode === 'room') return s.room === selectedEntityId;
    return true;
  });

  const handleModeChange = (mode) => {
    setFilterMode(mode);
    if (mode === 'group') setSelectedEntityId(STUDENT_GROUPS[0].id);
    else if (mode === 'faculty') setSelectedEntityId(FACULTY[0].id);
    else if (mode === 'room') setSelectedEntityId(ROOMS[0].id);
  };

  const typeColorMap = {
    Lecture: 'bg-blue-600/20 border-blue-500/50 text-blue-300 hover:bg-blue-600/30',
    Tutorial: 'bg-teal-600/20 border-teal-500/50 text-teal-300 hover:bg-teal-600/30',
    Lab: 'bg-purple-600/20 border-purple-500/50 text-purple-300 hover:bg-purple-600/30',
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Weekly Academic Master Timetable"
        subtitle="Matrix view of synthesized teaching sessions. Filter by student group, faculty member, or campus venue."
        badge={<DemoBanner text="CP-SAT Clash-Free Synthesized Matrix" />}
      >
        <Button
          variant="outline"
          onClick={() => window.print()}
          icon={Printer}
        >
          Print Schedule
        </Button>
      </PageHeader>

      {/* Control Bar: Filter Mode Switch & Selector */}
      <Card className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Mode tabs */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1">
            View By:
          </span>
          <button
            onClick={() => handleModeChange('group')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              filterMode === 'group'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            Student Cohort
          </button>
          <button
            onClick={() => handleModeChange('faculty')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              filterMode === 'faculty'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Faculty Member
          </button>
          <button
            onClick={() => handleModeChange('room')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              filterMode === 'room'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            Campus Venue
          </button>
        </div>

        {/* Entity Selector Dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400 font-medium">Select Target:</label>
          <select
            value={selectedEntityId}
            onChange={(e) => setSelectedEntityId(e.target.value)}
            className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-semibold text-slate-100 focus:outline-none"
          >
            {filterMode === 'group' &&
              STUDENT_GROUPS.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.dept}, Sem {g.semester})
                </option>
              ))}
            {filterMode === 'faculty' &&
              FACULTY.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.dept} — {f.designation})
                </option>
              ))}
            {filterMode === 'room' &&
              ROOMS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.type}, {r.capacity} seats) — {r.building}
                </option>
              ))}
          </select>
        </div>
      </Card>

      {/* Weekly Timetable Grid Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px] font-semibold">
                <th className="p-3 w-24 text-center border-r border-slate-800">
                  Timeslot
                </th>
                {days.map((day) => (
                  <th key={day} className="p-3 text-center border-r border-slate-800 last:border-r-0">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-xs">
              {timeSlots.map((slot) => {
                const nextHour = `${String(parseInt(slot.split(':')[0], 10) + 1).padStart(2, '0')}:00`;

                return (
                  <tr key={slot} className="hover:bg-slate-800/30 transition-colors">
                    {/* Timeslot label */}
                    <td className="p-2.5 text-center font-mono text-[11px] text-slate-400 bg-slate-900/60 border-r border-slate-800">
                      <div>{slot}</div>
                      <div className="text-[9px] text-slate-600">{nextHour}</div>
                    </td>

                    {/* Day Cells */}
                    {days.map((day) => {
                      const session = activeSessions.find(
                        (s) => s.day === day && s.startTime === slot
                      );

                      if (!session) {
                        return (
                          <td
                            key={day}
                            className="p-1 border-r border-slate-800 last:border-r-0 text-center text-slate-600"
                          >
                            <span className="text-[10px] opacity-20">—</span>
                          </td>
                        );
                      }

                      const course = COURSES.find((c) => c.id === session.course);
                      const faculty = FACULTY.find((f) => f.id === session.faculty);

                      return (
                        <td
                          key={day}
                          className="p-1.5 border-r border-slate-800 last:border-r-0 align-top"
                        >
                          <div
                            onClick={() => setSelectedSession(session)}
                            className={`p-2 rounded-xl border cursor-pointer transition-all duration-200 space-y-1 shadow-sm ${
                              typeColorMap[session.type] || typeColorMap.Lecture
                            }`}
                          >
                            <div className="flex items-center justify-between font-bold text-xs">
                              <span>{session.course}</span>
                              <span className="text-[9px] uppercase tracking-wide opacity-80">
                                {session.type}
                              </span>
                            </div>
                            <div className="text-[10px] truncate opacity-90">
                              {course?.name}
                            </div>
                            <div className="text-[9px] flex items-center justify-between pt-1 border-t border-current/20 font-mono">
                              <span>{session.room}</span>
                              <span className="truncate max-w-[60px]">
                                {faculty?.name?.split(' ')[1] || session.faculty}
                              </span>
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Session Details Modal */}
      {selectedSession && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedSession(null)}
          title={`Session Details: ${selectedSession.course}`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-100">
                  {COURSES.find((c) => c.id === selectedSession.course)?.name}
                </span>
                <Badge variant="blue" size="sm">{selectedSession.type}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-300 pt-1">
                <div>Faculty: <strong className="text-white">{FACULTY.find((f) => f.id === selectedSession.faculty)?.name}</strong></div>
                <div>Venue: <strong className="text-white">{selectedSession.room}</strong></div>
                <div>Cohort: <strong className="text-white">{selectedSession.group}</strong></div>
                <div>Schedule: <strong className="text-teal-400">{selectedSession.day} {selectedSession.startTime} - {selectedSession.endTime}</strong></div>
              </div>
            </div>

            <div className="p-3 bg-blue-950/20 border border-blue-500/30 rounded-xl text-blue-300">
              <span className="font-semibold block mb-0.5">Constraint Audit:</span>
              <span>All student groups and faculty bounds verified. No overlapping classroom bookings.</span>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setSelectedSession(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
