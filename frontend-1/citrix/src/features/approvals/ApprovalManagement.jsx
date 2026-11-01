// src/features/approvals/ApprovalManagement.jsx
import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useBookingStore } from '@/store/bookingStore';
import { spectraService } from '@/services/spectraService';
import { roomService } from '@/services/roomService';
import { ROOMS } from '@/data/demoData';
import {
  FileCheck2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building,
  Calendar,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Search,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { Badge, Button, Card, PageHeader, DemoBanner, Modal, StatusBadge } from '@/components/common';
import { useToast } from '@/components/common/Toaster';

export default function ApprovalManagement() {
  const toast = useToast();
  const { user } = useAuthStore();
  const { bookings, loading: bookingsLoading, error: bookingsError, fetchBookings, approveBooking, rejectBooking } = useBookingStore();

  const [activeTab, setActiveTab] = useState('bookings'); // 'bookings' or 'spectra'
  const [selectedItems, setSelectedItems] = useState([]);
  const [spectraEvents, setSpectraEvents] = useState([]);
  const [spectraLoading, setSpectraLoading] = useState(false);
  const [spectraError, setSpectraError] = useState(null);
  const [roomsList, setRoomsList] = useState([]);

  const loadSpectra = async () => {
    setSpectraLoading(true);
    setSpectraError(null);
    try {
      const res = await spectraService.getEvents();
      setSpectraEvents(res.data || []);
    } catch (err) {
      setSpectraError(err.message || 'Failed to load Spectra events');
      setSpectraEvents([]);
    } finally {
      setSpectraLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
    loadSpectra();
    roomService.getRooms().then(res => {
      if (res.data?.length) setRoomsList(res.data);
    }).catch(() => {});
  }, [fetchBookings]);

  // Modal for rejection
  const [rejectingItem, setRejectingItem] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('Venue required for institutional priority schedule');
  const [alternativeVenue, setAlternativeVenue] = useState('SH-2');

  const pendingBookings = (bookings || []).filter((b) => b.status === 'pending');
  const pendingSpectra = (spectraEvents || []).filter((e) => e.status === 'pending');
  const availableRooms = roomsList.length > 0 ? roomsList : ROOMS;

  const handleApproveBooking = async (booking) => {
    const id = booking.id;
    const title = booking.title;
    const requester = booking.requestedBy;

    // Check self-approval
    if (
      requester === user?.role ||
      (user?.role === 'admin' && requester === 'admin') ||
      requester === user?.id ||
      requester === user?.email ||
      requester === user?.name
    ) {
      toast.error('Self-Approval Restricted: You cannot approve your own booking application.');
      return;
    }
    try {
      const placement = {
        room_id: booking.room !== 'TBD' ? booking.room : (booking.requested_room || 'L-101'),
        day: booking.day !== 'TBD' ? booking.day : (booking.windows?.[0]?.day || 'MON'),
        start_period: booking.assigned_start_period || booking.windows?.[0]?.from_period || 6,
        end_period: booking.assigned_end_period || booking.windows?.[0]?.to_period || 7,
      };
      await approveBooking(id, placement);
      toast.success(`Booking "${title}" approved!`);
    } catch (err) {
      toast.error(err.message || 'Approval rejected by institutional policy');
    }
  };

  const handleApproveSpectra = async (event) => {
    try {
      const placement = {
        room_id: event.room !== 'TBD' ? event.room : (event.requestedRoom || 'AUD'),
        day: event.day || 'FRI',
        start_period: event.startPeriod || 6,
        end_period: event.endPeriod || 8,
        reason: 'Approved by Spectra Committee',
      };
      await spectraService.approveEvent(event.id, placement);
      toast.success(`Spectra event "${event.title}" approved!`);
      loadSpectra();
    } catch (err) {
      toast.error(err.message || 'Spectra approval failed');
    }
  };

  const handleOpenReject = (item) => {
    setRejectingItem(item);
  };

  const handleConfirmReject = async () => {
    if (!rejectingItem) return;
    try {
      if (activeTab === 'spectra') {
        await spectraService.rejectEvent(rejectingItem.id, rejectionReason, alternativeVenue);
        toast.info(`Rejected Spectra event "${rejectingItem.title}". Alternative: ${alternativeVenue}`);
        loadSpectra();
      } else {
        await rejectBooking(rejectingItem.id, rejectionReason, { room_id: alternativeVenue });
        toast.info(`Rejected "${rejectingItem.title}". Alternative suggested: ${alternativeVenue}`);
      }
    } catch (err) {
      toast.error(err.message || 'Rejection failed');
    }
    setRejectingItem(null);
  };

  const handleBulkApprove = async () => {
    if (selectedItems.length === 0) return;
    let approvedCount = 0;
    for (const id of selectedItems) {
      const item = (bookings || []).find(b => b.id === id);
      if (item) {
        try {
          await approveBooking(id, {
            room_id: item.room !== 'TBD' ? item.room : (item.requested_room || 'L-101'),
            day: item.day !== 'TBD' ? item.day : (item.windows?.[0]?.day || 'MON'),
            start_period: item.assigned_start_period || item.windows?.[0]?.from_period || 6,
            end_period: item.assigned_end_period || item.windows?.[0]?.to_period || 7,
          });
          approvedCount++;
        } catch (e) {
          console.error(`Failed to bulk approve ${id}:`, e);
        }
      }
    }
    toast.success(`${approvedCount} items bulk approved!`);
    setSelectedItems([]);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Institutional Approvals & Authorization Queue"
        subtitle="Authorize campus venue reservations and Spectra club applications. Enforces conflict checks and prevents self-approval."
        badge={<DemoBanner text="Institutional Governance & Anti-Conflict Rules" />}
      >
        {selectedItems.length > 0 && (
          <Button variant="emerald" onClick={handleBulkApprove} icon={CheckCircle2}>
            Approve Selected ({selectedItems.length})
          </Button>
        )}
      </PageHeader>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('bookings')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'bookings'
              ? 'bg-[#B8F36B] text-[#101110] font-bold shadow-glow-sm'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          Venue Bookings ({pendingBookings.length} Pending)
        </button>
        <button
          onClick={() => setActiveTab('spectra')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'spectra'
              ? 'bg-purple-600 text-white shadow-md'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          Spectra Week Events ({pendingSpectra.length} Pending)
        </button>
      </div>

      {/* Booking Requests List */}
      {activeTab === 'bookings' ? (
        <div className="space-y-3">
          {bookingsLoading ? (
            <Card className="p-12 text-center text-sm text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-[#B8F36B]" />
              Loading bookings from server...
            </Card>
          ) : bookingsError ? (
            <Card className="p-8 text-center text-sm text-rose-400 bg-rose-950/20 border-rose-900/40">
              Error loading bookings: {bookingsError}
            </Card>
          ) : pendingBookings.length === 0 ? (
            <Card className="p-12 text-center text-sm text-slate-500">
              No pending venue reservations in queue
            </Card>
          ) : (
            pendingBookings.map((b) => {
              const isSelf =
                b.requestedBy === user?.role ||
                (user?.role === 'admin' && b.requestedBy === 'admin') ||
                b.requestedBy === user?.email ||
                b.requestedBy === user?.name;

              return (
                <Card
                  key={b.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-slate-700/80 hover:border-slate-600"
                >
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(b.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedItems([...selectedItems, b.id]);
                        else setSelectedItems(selectedItems.filter((i) => i !== b.id));
                      }}
                      className="mt-1 rounded text-blue-600 focus:ring-0"
                    />

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base text-slate-100">
                          {b.title}
                        </span>
                        <Badge variant="amber" size="sm">
                          Pending
                        </Badge>
                        {isSelf && (
                          <Badge variant="red" size="sm">
                            Your Request (Self-Approval Disabled)
                          </Badge>
                        )}
                      </div>

                      <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-3">
                        <span>Venue: <strong className="text-slate-200">{b.room}</strong></span>
                        <span>•</span>
                        <span>Day/Time: <strong className="text-slate-200">{b.day} ({b.time})</strong></span>
                        <span>•</span>
                        <span>Attendees: {b.attendance}</span>
                        <span>•</span>
                        <span>Requester: <strong className="text-slate-300 capitalize">{b.requestedBy}</strong></span>
                      </div>

                      {b.raw_text && (
                        <p className="text-[11px] text-[#B8F36B] italic mt-1.5">
                          "{b.raw_text}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="emerald"
                      size="sm"
                      disabled={isSelf}
                      onClick={() => handleApproveBooking(b)}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleOpenReject(b)}
                    >
                      Reject
                    </Button>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      ) : (
        /* Spectra Events Tab */
        <div className="space-y-3">
          {spectraLoading ? (
            <Card className="p-12 text-center text-sm text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
              Loading Spectra events from server...
            </Card>
          ) : spectraError ? (
            <Card className="p-8 text-center text-sm text-rose-400 bg-rose-950/20 border-rose-900/40">
              Error loading Spectra events: {spectraError}
            </Card>
          ) : pendingSpectra.length === 0 ? (
            <Card className="p-12 text-center text-sm text-slate-500">
              No pending Spectra festival proposals in queue
            </Card>
          ) : (
            pendingSpectra.map((event) => (
              <Card
                key={event.id}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-slate-700/80 hover:border-slate-600"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-slate-100">
                      {event.title}
                    </span>
                    <Badge variant="purple" size="sm">
                      Priority P{event.priority || 6}
                    </Badge>
                    <span className="text-xs text-slate-400 font-medium">
                      Club: {event.club}
                    </span>
                  </div>

                  <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-3">
                    <span>Venue: <strong className="text-slate-200">{event.requestedRoom}</strong></span>
                    <span>•</span>
                    <span>Slot: {event.day} (P{event.startPeriod}-P{event.endPeriod})</span>
                    <span>•</span>
                    <span>Estimated: {event.attendance} pax</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="emerald"
                    size="sm"
                    onClick={() => handleApproveSpectra(event)}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleOpenReject(event)}
                  >
                    Reject
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Reject Modal */}
      {rejectingItem && (
        <Modal
          isOpen={true}
          onClose={() => setRejectingItem(null)}
          title={`Reject Application: ${rejectingItem.title}`}
        >
          <div className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">
                Official Rejection Reason
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={2}
                className="w-full p-2 bg-[#080A09] border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">
                Recommend Alternative Venue
              </label>
              <select
                value={alternativeVenue}
                onChange={(e) => setAlternativeVenue(e.target.value)}
                className="w-full p-2 bg-[#080A09] border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-none"
              >
                {availableRooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name || r.id} ({r.type}, {r.capacity} seats) — {r.building}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setRejectingItem(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleConfirmReject}>
                Confirm Rejection
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
