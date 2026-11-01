// src/features/admin/MidsemScheduling.jsx
import React, { useState, useEffect } from 'react';
import { examService } from '@/services/examService';
import {
  CalendarRange,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Building,
  Users,
  Search,
  Download,
  Filter,
  Layers,
  ArrowRight,
  Loader2,
  UploadCloud,
} from 'lucide-react';
import { Badge, Button, Card, PageHeader, DemoBanner, StatusBadge } from '@/components/common';
import { useToast } from '@/components/common/Toaster';

export default function MidsemScheduling() {
  const toast = useToast();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'conflicts', 'unscheduled'
  const [searchQuery, setSearchQuery] = useState('');
  const [isSolving, setIsSolving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [hasGeneratedProposal, setHasGeneratedProposal] = useState(false);

  const loadExams = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await examService.getExams();
      setExams(resp.data || []);
    } catch (err) {
      console.error('Could not load live exams:', err);
      setError(err.message || 'Failed to load exams from backend');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExams();
  }, []);

  const scheduledCount = exams.filter((e) => e.status === 'scheduled').length;
  const unscheduledCount = exams.filter((e) => e.status === 'unscheduled').length;
  const conflictsCount = exams.filter((e) => e.status === 'conflict').length;

  const handleGenerateExamSchedule = async () => {
    setIsSolving(true);
    try {
      toast.info('Submitting request to CP-SAT Exam Solver with auto_publish=false...');
      const resp = await examService.generateSchedule({ time_limit_seconds: 15.0 });
      if (resp.data?.exams && resp.data.exams.length > 0) {
        setExams(resp.data.exams);
        setHasGeneratedProposal(true);
      }
      toast.success(`Exam proposal generated (${resp.data?.examsScheduled || resp.data?.exams?.length || 0} exams placed with halved capacity)! Review and publish when ready.`);
    } catch (err) {
      toast.error('Failed to trigger exam allocation service: ' + err.message);
    } finally {
      setIsSolving(false);
    }
  };

  const handlePublishSchedule = async () => {
    setIsPublishing(true);
    try {
      await examService.publishSchedule(exams);
      toast.success('Exam schedule successfully published to authoritative campus schedule!');
      setHasGeneratedProposal(false);
      loadExams();
    } catch (err) {
      toast.error('Failed to publish exam schedule: ' + err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  const filteredExams = exams.filter((e) => {
    if (activeTab === 'conflicts') return e.status === 'conflict';
    if (activeTab === 'unscheduled') return e.status === 'unscheduled';
    if (searchQuery) {
      return (
        e.course?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.courseTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.room?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.group?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Midsem Examination Scheduling"
        subtitle="Manage 41 midsem exams (Nov 16–25), enforce 50% anti-cheating seating spacing, and resolve venue clashes"
        badge={<DemoBanner text="Exam Allocation Service • Anti-Cheating Capacity" />}
      >
        <div className="flex items-center gap-2">
          {hasGeneratedProposal && (
            <Button
              variant="emerald"
              onClick={handlePublishSchedule}
              loading={isPublishing}
              icon={UploadCloud}
            >
              Publish Proposal
            </Button>
          )}
          <Button
            variant="primary"
            onClick={handleGenerateExamSchedule}
            loading={isSolving}
            icon={Sparkles}
          >
            {isSolving ? 'Optimizing Seating...' : 'Run Exam Seating Solver'}
          </Button>
        </div>
      </PageHeader>

      {/* Status metrics bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block uppercase font-semibold">Total Exams</span>
            <span className="text-2xl font-black text-slate-100 mt-1 block">{exams.length} Exams</span>
            <span className="text-[11px] text-slate-500">14 Student Cohorts</span>
          </div>
          <CalendarRange className="w-8 h-8 text-[#B8F36B]/60" />
        </Card>

        <Card className="p-4 flex items-center justify-between border-emerald-500/30">
          <div>
            <span className="text-xs text-emerald-400 block uppercase font-semibold">Allocated</span>
            <span className="text-2xl font-black text-emerald-400 mt-1 block">{scheduledCount} Scheduled</span>
            <span className="text-[11px] text-slate-500">50% Capacity Respected</span>
          </div>
          <CheckCircle2 className="w-8 h-8 text-emerald-400/60" />
        </Card>

        <Card className="p-4 flex items-center justify-between border-amber-500/30">
          <div>
            <span className="text-xs text-amber-400 block uppercase font-semibold">Pending Slot</span>
            <span className="text-2xl font-black text-amber-400 mt-1 block">{unscheduledCount} Unscheduled</span>
            <span className="text-[11px] text-slate-500">Awaiting Room Assignment</span>
          </div>
          <AlertTriangle className="w-8 h-8 text-amber-400/60" />
        </Card>

        <Card className="p-4 flex items-center justify-between border-red-500/30 bg-red-950/10">
          <div>
            <span className="text-xs text-red-400 block uppercase font-semibold">Room Clashes</span>
            <span className="text-2xl font-black text-red-400 mt-1 block">{conflictsCount} In Conflict</span>
            <span className="text-[11px] text-red-300">{conflictsCount > 0 ? 'Double Booking Detected' : 'No Clashes Detected'}</span>
          </div>
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </Card>
      </div>

      {/* Critical Conflict Banner */}
      {conflictsCount > 0 && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-fade-in">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-red-200">
                CRITICAL EXAM CONFLICT: Scheduling clash detected in current plan
              </div>
              <div className="text-slate-300 mt-0.5">
                Multiple exams are assigned to the same room and slot simultaneously. Run CP-SAT seating solver to resolve.
              </div>
            </div>
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={handleGenerateExamSchedule}
            loading={isSolving}
          >
            Auto-Resolve Clashes
          </Button>
        </div>
      )}

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'all'
                ? 'bg-[#B8F36B] text-[#101110] font-bold shadow-glow-sm'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            All Exams ({exams.length})
          </button>
          <button
            onClick={() => setActiveTab('conflicts')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'conflicts'
                ? 'bg-red-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Clashes ({conflictsCount})
          </button>
          <button
            onClick={() => setActiveTab('unscheduled')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'unscheduled'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Unscheduled ({unscheduledCount})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search course, room, group..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Exams Roster Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Exam ID / Course</th>
                <th className="py-3 px-4">Course Name</th>
                <th className="py-3 px-4">Slot</th>
                <th className="py-3 px-4">Allocated Room</th>
                <th className="py-3 px-4">Cohort</th>
                <th className="py-3 px-4">Strength</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-[#B8F36B]" />
                      Loading midsem exams from server...
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-rose-400 bg-rose-950/20">
                    Error loading exams: {error}
                  </td>
                </tr>
              ) : filteredExams.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No midsem exams match current filter
                  </td>
                </tr>
              ) : (
                filteredExams.map((exam) => {
                  const isClash = exam.status === 'conflict';

                  return (
                    <tr
                      key={exam.id}
                      className={`hover:bg-slate-800/50 transition-colors ${
                        isClash ? 'bg-red-950/20' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-100">{exam.course}</span>
                        <span className="text-[10px] text-slate-500 block">{exam.id}</span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-200">
                        {exam.courseTitle}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        <div>{exam.slot || `${exam.day} (${exam.session})`}</div>
                        <div className="text-[11px] text-teal-400 font-mono">
                          Duration: {exam.durationHours} hrs
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-semibold ${
                            isClash ? 'text-red-400 font-bold' : 'text-slate-100'
                          }`}
                        >
                          {exam.room}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{exam.group}</td>
                      <td className="py-3 px-4 text-slate-300">
                        <span className="font-bold text-teal-400">{exam.size} Students</span>
                        <span className="text-[10px] text-slate-500 block">50% Halved Cap Enforced</span>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={exam.status} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
