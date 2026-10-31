// src/features/approvals/ApprovalManagement.jsx
import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useBookingStore } from '@/store/bookingStore';
import { BOOKINGS, SPECTRA_EVENTS, ROOMS, PRIORITY_RULES } from '@/data/demoData';
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
  Sparkles
} from 'lucide-react';
import { Badge, Button, Card, PageHeader, DemoBanner, Modal, StatusBadge } from '@/components/common';
import { useToast } from '@/components/common/Toaster';

export default function ApprovalManagement() {
  const toast = useToast();
  const { user } = useAuthStore();
  const { bookings, fetchBookings, approveBooking, rejectBooking } = useBookingStore();

  const [activeTab, setActiveTab] = useState('bookings'); // 'bookings' or 'spectra'
  const [selectedItems, setSelectedItems] = useState([]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Modal for rejection
  const [rejectingItem, setRejectingItem] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('Venue required for midsem exams');
  const [alternativeVenue, setAlternativeVenue] = useState('SH-2');

  const allBookings = bookings.length > 0 ? bookings : BOOKINGS;
  const pendingBookings = allBookings.filter((b) => b.status === 'pending');
  const pendingSpectra = SPECTRA_EVENTS.filter((e) => e.status === 'pending');

  const handleApproveBooking = async (id, title, requester) => {
    // Check self-approval
    if (requester === user?.role || (user?.role === 'admin' && requester === 'admin') || requester === user?.id || requester === user?.name) {
      toast.error('Self-Approval Restricted: You cannot approve your own booking application.');
      return;
    }
    try {
      await approveBooking(id);
      toast.success(`Booking "${title}" approved!`);
    } catch (err) {
      toast.error(err.message || 'Approval rejected by institutional policy');
    }
  };

  const handleOpenReject = (item) => {
    setRejectingItem(item);
  };

  const handleConfirmReject = async () => {
    if (!rejectingItem) return;
    try {
      await rejectBooking(rejectingItem.id, rejectionReason, alternativeVenue);
      toast.info(`Rejected "${rejectingItem.title}". Alternative suggested: ${alternativeVenue}`);
    } catch (err) {
      toast.error(err.message || 'Rejection failed');
    }
    setRejectingItem(null);
  };

  const handleBulkApprove = () => {
    if (selectedItems.length === 0) return;
    selectedItems.forEach((id) => approveBooking(id));
    toast.success(`${selectedItems.length} items bulk approved!`);
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
              ? 'bg-blue-600 text-white shadow-md'
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
          {pendingBookings.length === 0 ? (
            <Card className="p-12 text-center text-sm text-slate-500">
              No pending venue reservations in queue
            </Card>
          ) : (
            pendingBookings.map((b) => {
              const isSelf =
                b.requestedBy === user?.role ||
                (user?.role === 'admin' && b.requestedBy === 'admin');

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
                        <span>Date: <strong className="text-slate-200">{b.date}</strong> ({b.startTime} - {b.endTime})</span>
                        <span>•</span>
                        <span>Attendees: {b.attendees}</span>
                        <span>•</span>
                        <span>Requester: <strong className="text-slate-300 capitalize">{b.requestedBy}</strong></span>
                      </div>

                      {b.nlText && (
                        <p className="text-[11px] text-blue-300 italic mt-1.5">
                          "{b.nlText}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="emerald"
                      size="sm"
                      disabled={isSelf}
                      onClick={() => handleApproveBooking(b.id, b.title, b.requestedBy)}
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
          {pendingSpectra.length === 0 ? (
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
                      {event.priority} Priority
                    </Badge>
                    <span className="text-xs text-slate-400 font-medium">
                      Club: {event.club}
                    </span>
                  </div>

                  <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-3">
                    <span>Venue: <strong className="text-slate-200">{event.requestedRoom}</strong></span>
                    <span>•</span>
                    <span>Date: {event.date} ({event.startTime} - {event.endTime})</span>
                    <span>•</span>
                    <span>Estimated: {event.attendees} pax</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="emerald"
                    size="sm"
                    onClick={() => {
                      toast.success(`Spectra event "${event.title}" approved!`);
                    }}
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
                className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">
                Recommend Alternative Venue
              </label>
              <select
                value={alternativeVenue}
                onChange={(e) => setAlternativeVenue(e.target.value)}
                className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-none"
              >
                {ROOMS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.type}, {r.capacity} seats) — {r.building}
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
