// src/features/admin/DisruptionManagement.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { rescheduleService } from '@/services/rescheduleService';
import { DISRUPTIONS, FACULTY, ROOMS, SESSIONS } from '@/data/demoData';
import {
  AlertTriangle,
  Sparkles,
  GitCompare,
  CheckCircle2,
  Calendar,
  Building,
  Users,
  PlusCircle,
  ArrowRight,
  ShieldAlert,
  Clock
} from 'lucide-react';
import { Badge, Button, Card, PageHeader, DemoBanner, Modal } from '@/components/common';
import { useToast } from '@/components/common/Toaster';

export default function DisruptionManagement() {
  const navigate = useNavigate();
  const toast = useToast();
  const [disruptions, setDisruptions] = useState(DISRUPTIONS);
  const [modalOpen, setModalOpen] = useState(false);

  // New Disruption Form
  const [disruptionType, setDisruptionType] = useState('faculty_leave');
  const [selectedEntity, setSelectedEntity] = useState(FACULTY[2]?.id || 'F003');
  const [dateFrom, setDateFrom] = useState('2026-11-07');
  const [dateTo, setDateTo] = useState('2026-11-09');
  const [description, setDescription] = useState('Conference attendance at IIT');

  const handleReportDisruption = async (e) => {
    e.preventDefault();
    try {
      const res = await rescheduleService.submitDisruption({
        type: disruptionType,
        faculty_id: disruptionType === 'faculty_leave' ? selectedEntity : null,
        room_id: disruptionType === 'room_closure' ? selectedEntity : null,
        days: ['MON', 'TUE'],
        periods: [1, 2, 3],
        reason: description,
      });

      const newId = res.data?.request_id ? `D00${res.data.request_id}` : `D00${disruptions.length + 1}`;
      const newD = {
        id: newId,
        backendId: res.data?.request_id,
        type: disruptionType,
        description,
        from: dateFrom,
        to: dateTo,
        affectedSessions: ['S001', 'S002', 'S003'],
        status: 'pending_repair',
        proposalStatus: null,
      };
      setDisruptions([newD, ...disruptions]);
      setModalOpen(false);
      toast.success(
        res.demo
          ? 'Disruption recorded! CP-SAT repair proposal ready to generate.'
          : `Disruption #${res.data?.request_id} registered with CP-SAT engine!`
      );
    } catch (err) {
      toast.error('Failed to submit disruption: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campus Disruption & Timetable Repair"
        subtitle="Manage faculty leaves, emergency room closures, or curriculum changes. Propose minimal-movement schedule fixes."
        badge={<DemoBanner text="CP-SAT Minimal-Perturbation Solver" />}
      >
        <Button
          variant="primary"
          onClick={() => setModalOpen(true)}
          icon={PlusCircle}
        >
          Report New Disruption
        </Button>
      </PageHeader>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border-amber-500/30">
          <span className="text-xs text-amber-400 block font-semibold uppercase">
            Active Disruptions
          </span>
          <span className="text-2xl font-black text-slate-100 mt-1 block">
            {disruptions.filter((d) => d.status === 'pending_repair').length} Pending Repair
          </span>
          <span className="text-[11px] text-slate-500">
            Affecting 9 teaching sessions
          </span>
        </Card>

        <Card className="p-4 border-emerald-500/30">
          <span className="text-xs text-emerald-400 block font-semibold uppercase">
            Repairs Applied
          </span>
          <span className="text-2xl font-black text-emerald-400 mt-1 block">
            {disruptions.filter((d) => d.status === 'resolved').length} Resolved
          </span>
          <span className="text-[11px] text-slate-500">
            Approved by Dean's Office
          </span>
        </Card>

        <Card className="p-4 border-blue-500/30">
          <span className="text-xs text-blue-400 block font-semibold uppercase">
            Constraint Policy
          </span>
          <span className="text-sm font-bold text-slate-100 mt-1 block">
            Minimal-Movement (L1 Norm)
          </span>
          <span className="text-[11px] text-slate-500">
            Objective: Minimize student schedule perturbation
          </span>
        </Card>
      </div>

      {/* Disruptions List */}
      <div className="space-y-4">
        <h3 className="font-bold text-sm text-slate-200 uppercase tracking-wider">
          Active Disruption Incidents
        </h3>

        {disruptions.map((disruption) => {
          const isPending = disruption.status === 'pending_repair';

          return (
            <Card
              key={disruption.id}
              className={`p-5 space-y-4 ${
                isPending ? 'border-amber-500/40 bg-slate-900/90' : 'border-slate-800'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${
                      isPending
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-emerald-500/20 text-emerald-400'
                    }`}
                  >
                    {isPending ? (
                      <AlertTriangle className="w-5 h-5" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-100 text-sm">
                        {disruption.id}: {disruption.description}
                      </span>
                      <Badge
                        variant={isPending ? 'amber' : 'green'}
                        size="sm"
                      >
                        {isPending ? 'Repair Required' : 'Resolved'}
                      </Badge>
                    </div>
                    <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                      <span>Window: {disruption.from} to {disruption.to}</span>
                      <span>•</span>
                      <span>
                        {disruption.affectedSessions?.length || 0} Teaching Sessions Affected
                      </span>
                    </div>
                  </div>
                </div>

                {isPending && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() =>
                      navigate(`/admin/timetable/compare?disruption=${disruption.id}`)
                    }
                    icon={GitCompare}
                  >
                    Generate Repair & Compare Diff
                  </Button>
                )}
              </div>

              {/* Affected Sessions Chips */}
              {disruption.affectedSessions?.length > 0 && (
                <div className="pt-3 border-t border-slate-800/80">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                    Impacted Sessions
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {disruption.affectedSessions.map((sId) => {
                      const session = SESSIONS.find((s) => s.id === sId);
                      return (
                        <div
                          key={sId}
                          className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-slate-300 font-mono"
                        >
                          <span className="text-blue-400 font-bold">{sId}</span>: {session?.course || 'Class'} ({session?.day} {session?.startTime})
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* New Disruption Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Report Campus Disruption"
      >
        <form onSubmit={handleReportDisruption} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-slate-300">Disruption Category</label>
            <select
              value={disruptionType}
              onChange={(e) => setDisruptionType(e.target.value)}
              className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-none"
            >
              <option value="faculty_leave">Faculty Leave / Unavailability</option>
              <option value="room_closure">Venue Emergency / Maintenance Closure</option>
              <option value="extra_session">Curriculum Adjustment / Extra Session</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Date From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Date To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-300">Description / Reason</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-none"
              placeholder="e.g. Attending international symposium"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Submit & Trigger Repair Engine
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
