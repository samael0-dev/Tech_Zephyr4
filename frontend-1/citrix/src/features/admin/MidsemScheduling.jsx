// src/features/admin/MidsemScheduling.jsx
import React, { useState, useEffect } from 'react';
import { examService } from '@/services/examService';
import { MIDSEM_EXAMS, ROOMS, FACULTY, STUDENT_GROUPS } from '@/data/demoData';
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
  ArrowRight
} from 'lucide-react';
import { Badge, Button, Card, PageHeader, DemoBanner, StatusBadge } from '@/components/common';
import { useToast } from '@/components/common/Toaster';

export default function MidsemScheduling() {
  const toast = useToast();
  const [exams, setExams] = useState(MIDSEM_EXAMS);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'conflicts', 'capacity'
  const [searchQuery, setSearchQuery] = useState('');
  const [isSolving, setIsSolving] = useState(false);

  useEffect(() => {
    async function loadExams() {
      try {
        const resp = await examService.getExams();
        if (resp.data && resp.data.length > 0) {
          setExams(resp.data);
        }
      } catch (err) {
        console.warn('Could not load live exams:', err);
      }
    }
    loadExams();
  }, []);

  const scheduledCount = exams.filter((e) => e.status === 'scheduled').length;
  const unscheduledCount = exams.filter((e) => e.status === 'unscheduled').length;
  const conflictsCount = exams.filter((e) => e.status === 'conflict').length;

  const handleGenerateExamSchedule = async () => {
    setIsSolving(true);
    try {
      const resp = await examService.generateSchedule();
      if (resp.data?.exams && resp.data.exams.length > 0) {
        setExams(resp.data.exams);
      }
      if (resp.demo) {
        toast.info('Exam seating schedule generated (Demo Fallback)');
      } else {
        toast.success(`Exam seating solved (${resp.data?.examsScheduled || 41} exams placed with halved capacity)!`);
      }
    } catch (err) {
      toast.error('Failed to trigger exam allocation service: ' + err.message);
    } finally {
      setIsSolving(false);
    }
  };

  const filteredExams = exams.filter((e) => {
    if (activeTab === 'conflicts') return e.status === 'conflict';
    if (activeTab === 'unscheduled') return e.status === 'unscheduled';
    if (searchQuery) {
      return (
        e.course.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.courseTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.room.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.group.toLowerCase().includes(searchQuery.toLowerCase())
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
        <Button
          variant="primary"
          onClick={handleGenerateExamSchedule}
          loading={isSolving}
          icon={Sparkles}
        >
          {isSolving ? 'Optimizing Seating...' : 'Run Exam Seating Solver'}
        </Button>
      </PageHeader>

      {/* Status metrics bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block uppercase font-semibold">Total Exams</span>
            <span className="text-2xl font-black text-slate-100 mt-1 block">41 Exams</span>
            <span className="text-[11px] text-slate-500">14 Student Cohorts</span>
          </div>
          <CalendarRange className="w-8 h-8 text-blue-400/60" />
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
            <span className="text-[11px] text-red-300">SH-1 Double Booking</span>
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
                CRITICAL EXAM CONFLICT: 2 Exams Assigned to SH-1 on Nov 25 at 09:00 AM
              </div>
              <div className="text-slate-300 mt-0.5">
                <strong>CS601 (Distributed Systems)</strong> and <strong>EC401 (Microprocessors)</strong> both claim Seminar Hall 1 simultaneously.
              </div>
            </div>
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              // Resolve conflict by moving EC401 to SH-2
              setExams((prev) =>
                prev.map((e) =>
                  e.id === 'ME041'
                    ? { ...e, room: 'SH-2', status: 'scheduled' }
                    : e.id === 'ME040'
                    ? { ...e, status: 'scheduled' }
                    : e
                )
              );
              toast.success('Clash resolved! EC401 moved to Seminar Hall 2 (SH-2)');
            }}
          >
            Auto-Resolve Clash
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
                ? 'bg-blue-600 text-white shadow-md'
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
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Allocated Room</th>
                <th className="py-3 px-4">Cohort</th>
                <th className="py-3 px-4">Normal / Effective Cap</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredExams.map((exam) => {
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
                      <div>{exam.date}</div>
                      <div className="text-[11px] text-teal-400 font-mono">
                        {exam.startTime} – {exam.endTime}
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
                      <span className="text-slate-400">{exam.capacity} Normal</span>
                      <span className="mx-1">/</span>
                      <span className="font-bold text-teal-400">
                        {exam.effectiveCapacity} (50% Rule)
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={exam.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
