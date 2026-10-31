// src/features/admin/SpectraManagement.jsx
import React, { useState, useEffect } from 'react';
import { spectraService } from '@/services/spectraService';
import { roomService } from '@/services/roomService';
import { ROOMS, PRIORITY_RULES } from '@/data/demoData';
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
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { Badge, Button, Card, PageHeader, DemoBanner, StatusBadge, Modal } from '@/components/common';
import { useToast } from '@/components/common/Toaster';

export default function SpectraManagement() {
  const toast = useToast();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [roomsList, setRoomsList] = useState([]);

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const loadEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await spectraService.getEvents();
      setEvents(resp.data || []);
    } catch (err) {
      console.error('Could not load live spectra events:', err);
      setError(err.message || 'Failed to load Spectra events from server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
    roomService.getRooms().then(res => {
      if (res.data?.length) setRoomsList(res.data);
    }).catch(() => {});
  }, []);

  // Modals for approval and rejection
  const [actionEvent, setActionEvent] = useState(null);
  const [actionType, setActionType] = useState(null); // 'approve' or 'reject'
  const [decisionReason, setDecisionReason] = useState('');
  const [alternativeRoom, setAlternativeRoom] = useState('SH-2');

  const categories = ['All', 'Technical', 'Cultural', 'Academic', 'Social', 'Sports'];
  const availableRooms = roomsList.length > 0 ? roomsList : ROOMS;

  const filteredEvents = events.filter((e) => {
    if (selectedCategory !== 'All' && e.category !== selectedCategory) return false;
    if (selectedStatus !== 'All' && e.status !== selectedStatus) return false;
    if (searchQuery) {
      return (
        e.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.club?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.requestedRoom?.toLowerCase().includes(searchQuery.toLowerCase())
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
      const placement = {
        room_id: actionEvent.room !== 'TBD' ? actionEvent.room : (actionEvent.requestedRoom || 'AUD'),
        day: actionEvent.day || 'FRI',
        start_period: actionEvent.startPeriod || 6,
        end_period: actionEvent.endPeriod || 8,
        reason: decisionReason,
      };

      try {
        await spectraService.approveEvent(actionEvent.id, placement);
        setEvents((prev) =>
          prev.map((e) =>
            e.id === actionEvent.id
              ? { ...e, status: 'approved', reason: decisionReason }
              : e
          )
        );
        toast.success(`Event "${actionEvent.title}" approved`);
      } catch (err) {
        toast.error(err.message || 'Approval failed');
      }
    } else {
      try {
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
                  suggestedRoom: alternativeRoom,
                }
              : e
          )
        );
        toast.info(
          `Event "${actionEvent.title}" rejected. Alternative venue: ${alternativeRoom}`
        );
      } catch (err) {
        toast.error(err.message || 'Rejection failed');
      }
    }

    setActionEvent(null);
  };

  const handleRunEvaluation = async () => {
    try {
      toast.info('Running CP-SAT Fest Week Venue Optimizer...');
      await spectraService.evaluateEvents();
      toast.success('CP-SAT evaluation completed. Preemption and assignment plan updated.');
      loadEvents();
    } catch (err) {
      toast.error(err.message || 'Optimizer evaluation failed');
    }
  };

  const priorityBadgeMap = {
    1: 'red',
    2: 'amber',
    3: 'purple',
    4: 'blue',
    5: 'teal',
    6: 'emerald',
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Spectra Fest Week Venue Decision Desk"
        subtitle="Schedule and adjudicate 34 club event bids against curricular academic priorities"
        badge={<DemoBanner text="CP-SAT Disruption Optimizer & Priority-Tier Governance" />}
      >
        <Button
          variant="primary"
          onClick={handleRunEvaluation}
          icon={Sparkles}
        >
          Evaluate & Optimise Allocations
        </Button>
      </PageHeader>

      {/* 6-Tier Priority Legend */}
      <Card className="p-4 space-y-2">
        <h4 className="font-bold text-xs uppercase text-slate-300 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-blue-400" />
          Authoritative 6-Tier Institutional Priority Hierarchy
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 text-xs">
          {PRIORITY_RULES.map((rule) => (
            <div key={rule.priority} className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
              <div className="flex items-center justify-between mb-1">
                <span className={`font-bold ${rule.color}`}>
                  {rule.label}
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
            placeholder="Search event, club, or room..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Events Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Event & Club</th>
                <th className="py-3 px-4">Priority Tier</th>
                <th className="py-3 px-4">Slot & Venue</th>
                <th className="py-3 px-4">Attendance</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Decision Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
                      Loading Spectra festival proposals from server...
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-rose-400 bg-rose-950/20">
                    Error loading Spectra proposals: {error}
                  </td>
                </tr>
              ) : filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No Spectra event bids match current filter
                  </td>
                </tr>
              ) : (
                filteredEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-100">{event.title}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Club: <span className="text-slate-300">{event.club}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge variant={priorityBadgeMap[event.priority] || 'blue'} size="sm">
                        P{event.priority || 6} Priority
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="text-slate-200 font-medium">{event.requestedRoom}</div>
                      <div className="text-[11px] text-slate-400">
                        {event.day} (P{event.startPeriod}-P{event.endPeriod})
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-300">
                      {event.attendance} pax
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge status={event.status} />
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {event.status === 'pending' ? (
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
                ))
              )}
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
              <div className="text-slate-400">Requested: <strong className="text-white">{actionEvent.requestedRoom}</strong> ({actionEvent.day}, P{actionEvent.startPeriod}-P{actionEvent.endPeriod})</div>
              <div className="text-slate-400">Priority: <Badge variant={priorityBadgeMap[actionEvent.priority] || 'blue'} size="sm">P{actionEvent.priority || 6}</Badge></div>
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
                  {availableRooms.filter((r) => r.id !== actionEvent.requestedRoom).map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name || r.id} ({r.type}, {r.capacity} seats) — {r.building}
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
