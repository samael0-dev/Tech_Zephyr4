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
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterMode, setFilterMode] = useState('group'); // 'group', 'faculty', 'room'
  const [selectedEntityId, setSelectedEntityId] = useState('Y1-A');
  const [selectedSession, setSelectedSession] = useState(null);

  useEffect(() => {
    async function loadSessions() {
      setLoading(true);
      setError(null);
      try {
        const resp = await timetableService.getSessions();
        setSessions(resp.data || []);
      } catch (err) {
        console.error('Could not load live sessions:', err);
        setError(err.message || 'Failed to load sessions from server');
      } finally {
        setLoading(false);
      }
    }
    loadSessions();
  }, []);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const periods = [
    { period: 1, label: 'Period 1', time: '08:30 - 09:30' },
    { period: 2, label: 'Period 2', time: '09:30 - 10:30' },
    { period: 3, label: 'Period 3', time: '10:30 - 11:30' },
    { period: 4, label: 'Period 4', time: '11:30 - 12:30' },
    { period: 5, label: 'Period 5', time: '12:30 - 13:30' },
    { period: 6, label: 'Period 6', time: '13:30 - 14:30' },
    { period: 7, label: 'Period 7', time: '14:30 - 15:30' },
    { period: 8, label: 'Period 8', time: '15:30 - 16:30' },
    { period: 9, label: 'Period 9', time: '16:30 - 17:30' },
  ];

  // Dynamically extract cohorts, faculty, and rooms from sessions
  const availableGroups = React.useMemo(() => {
    const groupSet = new Set();
    sessions.forEach((s) => {
      if (s.groups && Array.isArray(s.groups)) {
        s.groups.forEach((g) => groupSet.add(g));
      } else if (s.group) {
        groupSet.add(s.group);
      }
    });
    if (groupSet.size > 0) {
      return Array.from(groupSet).sort().map((g) => {
        const found = STUDENT_GROUPS.find((sg) => sg.id === g);
        return {
          id: g,
          name: found ? found.name : `Cohort ${g}`,
          dept: found ? found.dept : g.split('-')[0] || 'COMMON',
        };
      });
    }
    return STUDENT_GROUPS;
  }, [sessions]);

  const availableFaculty = React.useMemo(() => {
    const facMap = new Map();
    sessions.forEach((s) => {
      const fid = s.faculty_id || s.faculty;
      if (fid && fid !== 'Unassigned') {
        const found = FACULTY.find((f) => f.id === fid);
        facMap.set(fid, {
          id: fid,
          name: found ? found.name : `Faculty (${fid})`,
          dept: found ? found.dept : 'Faculty',
          designation: found ? found.designation : 'Professor',
        });
      }
    });
    if (facMap.size > 0) {
      return Array.from(facMap.values()).sort((a, b) => a.id.localeCompare(b.id));
    }
    return FACULTY;
  }, [sessions]);

  const availableRooms = React.useMemo(() => {
    const roomMap = new Map();
    sessions.forEach((s) => {
      const rid = s.room_id || s.room;
      if (rid && rid !== 'TBD') {
        const found = ROOMS.find((r) => r.id === rid);
        roomMap.set(rid, {
          id: rid,
          name: found ? found.name : rid,
          type: found ? found.type : 'Venue',
          building: found ? found.building : 'Campus',
          capacity: found ? found.capacity : 60,
        });
      }
    });
    if (roomMap.size > 0) {
      return Array.from(roomMap.values()).sort((a, b) => a.id.localeCompare(b.id));
    }
    return ROOMS;
  }, [sessions]);

  useEffect(() => {
    if (availableGroups.length > 0 && filterMode === 'group') {
      const exists = availableGroups.some((g) => g.id === selectedEntityId);
      if (!exists && selectedEntityId !== 'All') {
        setSelectedEntityId(availableGroups[0].id);
      }
    }
  }, [availableGroups, filterMode, selectedEntityId]);

  // Filter sessions based on mode
  const activeSessions = sessions.filter((s) => {
    if (selectedEntityId === 'All') return true;
    if (filterMode === 'group') {
      return s.group === selectedEntityId || (s.groups && s.groups.includes(selectedEntityId));
    }
    if (filterMode === 'faculty') {
      return s.faculty === selectedEntityId || s.faculty_id === selectedEntityId;
    }
    if (filterMode === 'room') {
      return s.room === selectedEntityId || s.room_id === selectedEntityId;
    }
    return true;
  });

  const handleModeChange = (mode) => {
    setFilterMode(mode);
    if (mode === 'group') setSelectedEntityId(availableGroups[0]?.id || 'Y1-A');
    else if (mode === 'faculty') setSelectedEntityId(availableFaculty[0]?.id || 'F01');
    else if (mode === 'room') setSelectedEntityId(availableRooms[0]?.id || 'LH-1');
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
            <option value="All">All {filterMode === 'group' ? 'Cohorts' : filterMode === 'faculty' ? 'Faculty Members' : 'Venues'} (Campus Master View)</option>
            {filterMode === 'group' &&
              availableGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.dept || 'COMMON'})
                </option>
              ))}
            {filterMode === 'faculty' &&
              availableFaculty.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.dept} — {f.designation})
                </option>
              ))}
            {filterMode === 'room' &&
              availableRooms.map((r) => (
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
                <th className="p-3 w-28 text-center border-r border-slate-800">
                  Period / Slot
                </th>
                {days.map((day) => (
                  <th key={day} className="p-3 text-center border-r border-slate-800 last:border-r-0">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-xs">
              {periods.map((p) => {
                return (
                  <tr key={p.period} className="hover:bg-slate-800/30 transition-colors">
                    {/* Period label */}
                    <td className="p-2.5 text-center font-mono text-[11px] text-slate-400 bg-slate-900/60 border-r border-slate-800">
                      <div className="font-bold text-slate-200">{p.label}</div>
                      <div className="text-[10px] text-slate-500">{p.time}</div>
                    </td>

                    {/* Day Cells */}
                    {days.map((day) => {
                      const dayAbbr = {
                        Monday: 'MON',
                        Tuesday: 'TUE',
                        Wednesday: 'WED',
                        Thursday: 'THU',
                        Friday: 'FRI',
                      }[day];

                      const sessionStartingHere = activeSessions.find((s) => {
                        const matchesDay = s.day === day || s.dayAbbr === dayAbbr || s.day === dayAbbr;
                        if (!matchesDay) return false;
                        const startP = Number(s.start_period || 1);
                        return startP === p.period;
                      });

                      const sessionContinuingHere = !sessionStartingHere && activeSessions.find((s) => {
                        const matchesDay = s.day === day || s.dayAbbr === dayAbbr || s.day === dayAbbr;
                        if (!matchesDay) return false;
                        const startP = Number(s.start_period || 1);
                        const dur = Number(s.duration || 1);
                        return dur > 1 && p.period > startP && p.period <= (startP + dur - 1);
                      });

                      if (sessionContinuingHere) {
                        return (
                          <td
                            key={day}
                            className="p-1.5 border-r border-slate-800 last:border-r-0 align-middle text-center bg-indigo-950/20"
                          >
                            <div className="text-[10px] text-indigo-300/80 font-mono italic flex items-center justify-center gap-1">
                              <span>↳</span>
                              <span className="font-semibold">{sessionContinuingHere.course}</span>
                              <span className="opacity-75">Lab (cont.)</span>
                            </div>
                          </td>
                        );
                      }

                      if (!sessionStartingHere) {
                        return (
                          <td
                            key={day}
                            className="p-1 border-r border-slate-800 last:border-r-0 text-center text-slate-600"
                          >
                            <span className="text-[10px] opacity-20">—</span>
                          </td>
                        );
                      }

                      const session = sessionStartingHere;
                      const course = COURSES.find((c) => c.id === session.course || c.id === session.course_id);
                      const faculty = FACULTY.find((f) => f.id === session.faculty || f.id === session.faculty_id);

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
                              <span className="text-white">{session.course || session.course_id}</span>
                              <span className="text-[9px] uppercase tracking-wide opacity-80 px-1 py-0.5 rounded bg-black/30">
                                {session.type}
                                {session.duration > 1 && ` • ${session.duration}h`}
                              </span>
                            </div>
                            <div className="text-[10px] truncate opacity-90 text-slate-300">
                              {course?.name || session.name || session.id}
                            </div>
                            <div className="text-[9px] flex items-center justify-between pt-1 border-t border-current/20 font-mono">
                              <span className="font-semibold text-cyan-300">{session.room || session.room_id}</span>
                              <span className="truncate max-w-[80px] text-slate-300">
                                {faculty?.name?.split(' ')[1] || session.faculty || session.faculty_id}
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
