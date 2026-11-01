// src/features/faculty/FacultyUnavailability.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { rescheduleService } from '@/services/rescheduleService';
import { SESSIONS, COURSES } from '@/data/demoData';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  Info,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { Badge, Button, Card, PageHeader, DemoBanner } from '@/components/common';
import { useToast } from '@/components/common/Toaster';

export default function FacultyUnavailability() {
  const navigate = useNavigate();
  const toast = useToast();

  const [reasonType, setReasonType] = useState('Conference/Workshop');
  const [dateFrom, setDateFrom] = useState('2026-11-12');
  const [dateTo, setDateTo] = useState('2026-11-14');
  const [comments, setComments] = useState('');
  const [selectedSessions, setSelectedSessions] = useState(['S023', 'S024']);
  const [submitting, setSubmitting] = useState(false);

  // Simulated history
  const [history, setHistory] = useState([
    {
      id: 'UN001',
      reason: 'Academic Conference (IEEE Bangalore)',
      dates: 'Nov 12 - Nov 14, 2026',
      status: 'pending_admin',
      affectedCount: 2,
    },
    {
      id: 'UN000',
      reason: 'Medical Leave',
      dates: 'Sep 10 - Sep 11, 2026',
      status: 'repaired_approved',
      affectedCount: 3,
    },
  ]);

  // Faculty sessions available to mark as affected
  const facultySessions = SESSIONS.filter(
    (s) => s.faculty === 'F001' || s.faculty === 'F002'
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await rescheduleService.submitDisruption({
        type: 'faculty_unavailable',
        days: ['THU', 'FRI'],
        periods: [1, 2],
        reason: `${reasonType}: ${comments || 'Leave request'}`,
      });

      setHistory([
        {
          id: res.data?.request_id ? `UN00${res.data.request_id}` : `UN00${history.length + 1}`,
          reason: `${reasonType}: ${comments || 'Leave request'}`,
          dates: `${dateFrom} to ${dateTo}`,
          status: 'pending_admin',
          affectedCount: selectedSessions.length,
        },
        ...history,
      ]);
      toast.success(
        res.demo
          ? 'Unavailability notice logged. Sent to Dean’s Office for minimal-movement repair proposal.'
          : `Disruption #${res.data?.request_id} registered with CP-SAT engine for timetable repair!`
      );
    } catch (err) {
      toast.error('Failed to submit unavailability: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSession = (id) => {
    if (selectedSessions.includes(id)) {
      setSelectedSessions(selectedSessions.filter((s) => s !== id));
    } else {
      setSelectedSessions([...selectedSessions, id]);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Faculty Unavailability Submission"
        subtitle="Log anticipated conference, medical, or research leaves. Triggers minimal-movement timetable repair for affected sessions."
        badge={<DemoBanner text="Automated Disruption Engine" />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Form */}
        <div className="lg:col-span-2 space-y-5">
          <Card className="p-6 space-y-5">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Submit Unavailability Window
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                All selected slots will be passed to CP-SAT solver to formulate repair proposals
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Absence Reason</label>
                <select
                  value={reasonType}
                  onChange={(e) => setReasonType(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-200 text-xs focus:outline-none"
                >
                  <option value="Conference/Workshop">Conference / Symposium Presentation</option>
                  <option value="Medical Leave">Medical Leave</option>
                  <option value="Research Visit">Academic Research Visit</option>
                  <option value="Personal Emergency">Personal Emergency</option>
                  <option value="Institutional Duty">Official Institutional Duty</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">From Date</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-200 text-xs focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">To Date</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-200 text-xs focus:outline-none"
                  />
                </div>
              </div>

              {/* Checkboxes for Impacted Teaching Sessions */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="font-semibold text-slate-300 block">
                  Select Affected Teaching Sessions
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {facultySessions.map((s) => {
                    const isChecked = selectedSessions.includes(s.id);
                    const course = COURSES.find((c) => c.id === s.course);

                    return (
                      <div
                        key={s.id}
                        onClick={() => toggleSession(s.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                          isChecked
                            ? 'bg-amber-950/20 border-amber-500/50 text-amber-200'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="rounded text-amber-600 focus:ring-0"
                          />
                          <div>
                            <span className="font-bold text-slate-200 block">
                              {s.course}: {course?.name} ({s.day} {s.startTime})
                            </span>
                            <span className="text-[11px] text-slate-400">
                              Cohort: {s.group} • Room: {s.room}
                            </span>
                          </div>
                        </div>
                        <Badge variant={isChecked ? 'amber' : 'slate'} size="sm">
                          {s.id}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">
                  Additional Notes for Academic Dean
                </label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={2}
                  placeholder="e.g. Presentation scheduled on Day 2; substitute faculty Dr. Nair agreed in principle"
                  className="w-full p-2.5 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-200 text-xs focus:outline-none"
                />
              </div>

              <div className="p-3 bg-[#121614] border border-[#B8F36B]/30 rounded-xl text-[11px] text-[#B8F36B] flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0 text-[#B8F36B]" />
                <span>
                  Admin Policy: Once submitted, the CITRIX repair engine generates an alternative slot moving minimal classes.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="primary"
                  type="submit"
                  loading={submitting}
                >
                  Submit Absence Notice
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Right 1 Col: Past Unavailability Records */}
        <div className="space-y-5">
          <Card className="p-5 space-y-4">
            <h3 className="font-bold text-sm text-slate-100 uppercase tracking-wider">
              Previous Leave Submissions
            </h3>

            <div className="space-y-3 text-xs">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <span className="font-bold text-slate-200">{item.reason}</span>
                    <Badge
                      variant={
                        item.status === 'pending_admin' ? 'amber' : 'green'
                      }
                      size="sm"
                    >
                      {item.status === 'pending_admin' ? 'Under Review' : 'Resolved'}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Dates: {item.dates}
                  </div>
                  <div className="text-[10px] text-teal-400">
                    {item.affectedCount} sessions rescheduled by solver
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
