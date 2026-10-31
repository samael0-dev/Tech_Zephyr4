// src/features/admin/SpectraManagement.jsx
import React, { useState, useEffect } from 'react';
import { spectraService } from '@/services/spectraService';
import { SPECTRA_EVENTS, ROOMS, PRIORITY_RULES } from '@/data/demoData';
import {
  CalendarCheck2,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  Building,
  Users,
  Search,
  Filter,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';
import { Badge, Button, Card, PageHeader, DemoBanner, StatusBadge, Modal } from '@/components/common';
import { useToast } from '@/components/common/Toaster';

export default function SpectraManagement() {
  const toast = useToast();
  const [events, setEvents] = useState(SPECTRA_EVENTS);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadEvents() {
      try {
        const resp = await spectraService.getEvents();
        if (resp.data && resp.data.length > 0) {
          setEvents(resp.data);
        }
      } catch (err) {
        console.warn('Could not load live spectra events:', err);
      }
    }
    loadEvents();
  }, []);

  // Modals for approval and rejection
  const [actionEvent, setActionEvent] = useState(null);
  const [actionType, setActionType] = useState(null); // 'approve' or 'reject'
  const [decisionReason, setDecisionReason] = useState('');
  const [alternativeRoom, setAlternativeRoom] = useState('SH-2');

  const categories = ['All', 'Technical', 'Cultural', 'Academic', 'Social', 'Sports'];

  const filteredEvents = events.filter((e) => {
    if (selectedCategory !== 'All' && e.category !== selectedCategory) return false;
    if (selectedStatus !== 'All' && e.status !== selectedStatus) return false;
    if (searchQuery) {
      return (
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.club.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.requestedRoom.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return true;
  });

  const handleOpenAction = (event, type) => {
    setActionEvent(event);
    setActionType(type);
    setDecisionReason(
      type === 'approve'
        ? 'Sanctioned under institutional priority guidelines'
        : 'Venue occupied for scheduled academic makeup classes'
    );
    setAlternativeRoom(event.alternativeRoom || 'SH-2');
  };

  const handleConfirmDecision = async () => {
    if (!actionEvent) return;

    if (actionType === 'approve') {
      await spectraService.approveEvent(actionEvent.id, decisionReason);
      setEvents((prev) =>
        prev.map((e) =>
          e.id === actionEvent.id
            ? { ...e, status: 'approved', reason: decisionReason }
            : e
        )
      );
      toast.success(`Event "${actionEvent.title}" approved`);
    } else {
      await spectraService.rejectEvent(
        actionEvent.id,
        decisionReason,
        alternativeRoom
      );
      setEvents((prev) =>
        prev.map((e) =>
          e.id === actionEvent.id
            ? {
                ...e,
                status: 'rejected',
                reason: decisionReason,
                alternativeRoom,
              }
            : e
        )
      );
      toast.info(`Event "${actionEvent.title}" rejected. Alternative suggested: ${alternativeRoom}`);
    }

    setActionEvent(null);
  };

  const priorityBadgeMap = {
    'Very High': 'red',
    High: 'amber',
    Medium: 'blue',
    Low: 'slate',
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Spectra Week Event Management"
        subtitle="Review 25 campus club venue proposals, apply Section 4 priority hierarchy, and recommend alternatives"
        badge={<DemoBanner text="Priority-Based Allocation Rule Engine" />}
      />

      {/* Priority Rules Reference Accordion / Card */}
      <Card className="p-4 bg-slate-900/90 border-blue-500/20">
        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-400" />
          Spectra Week Institutional Priority Hierarchy (Section 4)
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {PRIORITY_RULES.map((rule) => (
            <div key={rule.priority} className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
              <div className="flex items-center justify-between mb-1">
                <span className={`font-bold ${rule.color}`}>
                  Priority {rule.priority}: {rule.label}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                {rule.description}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Category tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search event, club, venue..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Spectra Events Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Event Title & Club</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Priority Rank</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Requested Venue</th>
                <th className="py-3 px-4">Est. Crowd</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Dean Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredEvents.map((event) => (
                <tr key={event.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-100">{event.title}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {event.club} • Sub: {event.submittedBy}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {event.category}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={priorityBadgeMap[event.priority] || 'blue'} size="sm">
                      {event.priority}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    <div>{event.date}</div>
                    <div className="text-[11px] text-teal-400 font-mono">
                      {event.startTime} - {event.endTime}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-200">
                    {event.requestedRoom}
                  </td>
                  <td className="py-3 px-4 text-slate-300">{event.attendees} pax</td>
                  <td className="py-3 px-4">
                    <StatusBadge status={event.status} />
                    {event.reason && (
                      <span className="text-[10px] text-slate-500 block truncate max-w-[120px]" title={event.reason}>
                        {event.reason}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {event.status === 'pending' || event.status === 'conflict' ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="emerald"
                          size="sm"
                          className="text-[11px] py-1 px-2.5"
                          onClick={() => handleOpenAction(event, 'approve')}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          className="text-[11px] py-1 px-2.5"
                          onClick={() => handleOpenAction(event, 'reject')}
                        >
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-500 font-medium">
                        Decided
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Decision Modal */}
      {actionEvent && (
        <Modal
          isOpen={true}
          onClose={() => setActionEvent(null)}
          title={
            actionType === 'approve'
              ? `Approve Event: ${actionEvent.title}`
              : `Reject Event & Suggest Alternative`
          }
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <div className="text-slate-400">Club: <strong className="text-white">{actionEvent.club}</strong></div>
              <div className="text-slate-400">Requested: <strong className="text-white">{actionEvent.requestedRoom}</strong> ({actionEvent.date}, {actionEvent.startTime} - {actionEvent.endTime})</div>
              <div className="text-slate-400">Priority: <Badge variant={priorityBadgeMap[actionEvent.priority]} size="sm">{actionEvent.priority}</Badge></div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300 block">
                Official Decision Reason (Logged in Audit Trail)
              </label>
              <textarea
                value={decisionReason}
                onChange={(e) => setDecisionReason(e.target.value)}
                rows={3}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {actionType === 'reject' && (
              <div className="space-y-1">
                <label className="font-semibold text-slate-300 block">
                  Suggest Alternative Campus Venue
                </label>
                <select
                  value={alternativeRoom}
                  onChange={(e) => setAlternativeRoom(e.target.value)}
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-none"
                >
                  {ROOMS.filter((r) => r.id !== actionEvent.requestedRoom).map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.type}, {r.capacity} seats) — {r.building}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <Button variant="ghost" onClick={() => setActionEvent(null)}>
                Cancel
              </Button>
              <Button
                variant={actionType === 'approve' ? 'emerald' : 'danger'}
                onClick={handleConfirmDecision}
              >
                {actionType === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
