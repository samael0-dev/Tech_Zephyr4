// src/features/bookings/BookingDetail.jsx
import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { BOOKINGS, ROOMS } from '@/data/demoData';
import { useBookingStore } from '@/store/bookingStore';
import { useAuthStore } from '@/store/authStore';
import {
  ChevronLeft,
  Building,
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { Badge, Button, Card, PageHeader, StatusBadge, DemoBanner } from '@/components/common';
import { useToast } from '@/components/common/Toaster';

export default function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user, canApprove } = useAuthStore();
  const { bookings, approveBooking, rejectBooking } = useBookingStore();

  const allBookings = bookings.length > 0 ? bookings : BOOKINGS;
  const booking = allBookings.find((b) => b.id === id) || allBookings[0];
  const roomObj = ROOMS.find((r) => r.id === booking.room);

  const [rejectReason, setRejectReason] = useState('');
  const [altRoom, setAltRoom] = useState('SH-2');
  const [showRejectBox, setShowRejectBox] = useState(false);

  // Self-approval check (Section 2 rule: Nobody can approve their own request)
  const isSelfRequest =
    booking.requestedBy === user?.role ||
    (user?.role === 'admin' && booking.requestedBy === 'admin');

  const handleApprove = async () => {
    if (isSelfRequest) {
      toast.error('Permission Denied: Policy prohibits approving self-submitted requests.');
      return;
    }
    await approveBooking(booking.id);
    toast.success(`Booking ${booking.id} approved successfully!`);
  };

  const handleReject = async () => {
    await rejectBooking(
      booking.id,
      rejectReason || 'Venue allocated for academic midsem exams',
      altRoom
    );
    setShowRejectBox(false);
    toast.info(`Booking rejected. Alternative ${altRoom} suggested.`);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link to="/bookings" className="hover:text-blue-400 flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" />
          Bookings Registry
        </Link>
        <span>/</span>
        <span className="text-slate-200 font-medium">{booking.id}</span>
      </div>

      <PageHeader
        title={booking.title}
        subtitle={`Request ID: ${booking.id} • Registered via ${booking.type === 'nl' ? 'Smart NLP Prompt' : 'Manual Form'}`}
        badge={<StatusBadge status={booking.status} />}
      >
        <Button
          variant="outline"
          onClick={() => navigate(`/campus?room=${booking.room}`)}
          icon={Building}
        >
          View Venue in 3D Campus
        </Button>
      </PageHeader>

      {/* Self-approval prevention warning banner if applicable */}
      {isSelfRequest && booking.status === 'pending' && (
        <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/40 text-xs text-amber-300 flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <span className="font-bold block">Self-Approval Restricted</span>
            <span>
              Per Section 2 institutional governance, users cannot approve their own booking applications. This action must be countersigned by an independent authority.
            </span>
          </div>
        </div>
      )}

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-5 space-y-4">
          <h3 className="font-bold text-sm text-slate-100 uppercase tracking-wider border-b border-slate-800 pb-2">
            Reservation Parameters
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Allocated Venue:</span>
              <span className="font-bold text-slate-100">{booking.room}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Building / Block:</span>
              <span className="font-semibold text-slate-200">{roomObj?.building}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Target Date:</span>
              <span className="font-semibold text-slate-200">{booking.date}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Timeslot Window:</span>
              <span className="font-mono text-teal-400 font-bold">
                {booking.startTime} - {booking.endTime}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Expected Attendance:</span>
              <span className="font-semibold text-slate-200">{booking.attendees} seats requested</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Room Total Capacity:</span>
              <span className="font-semibold text-emerald-400">{roomObj?.capacity} seats</span>
            </div>
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <h3 className="font-bold text-sm text-slate-100 uppercase tracking-wider border-b border-slate-800 pb-2">
            Requester &amp; Purpose
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block mb-1">Requested By:</span>
              <span className="font-bold text-slate-100 capitalize">{booking.requestedBy}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">Purpose Statement:</span>
              <p className="text-slate-300 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                {booking.purpose || 'Academic workshop and practice session'}
              </p>
            </div>
            {booking.nlText && (
              <div>
                <span className="text-slate-400 block mb-1">Original Prompt (Natural Language):</span>
                <p className="text-blue-300 italic bg-blue-950/20 p-2.5 rounded-lg border border-blue-500/30">
                  "{booking.nlText}"
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Suggested Alternative Banner (if rejected) */}
      {booking.suggestedAlternative && (
        <Card className="p-5 border-teal-500/40 bg-teal-950/10 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-teal-300 flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-teal-400" />
              Suggested Alternative Venue: {booking.suggestedAlternative}
            </span>
            <Button
              variant="teal"
              size="sm"
              onClick={() => navigate(`/bookings/new?room=${booking.suggestedAlternative}`)}
            >
              Confirm Alternative Booking
            </Button>
          </div>
          <p className="text-slate-400">
            Dean's Office has recommended {booking.suggestedAlternative} as a clash-free substitute matching your capacity and facility criteria.
          </p>
        </Card>
      )}

      {/* Admin / Coordinator Approval Action Bar */}
      {booking.status === 'pending' && (
        <Card className="p-5 space-y-4 border-purple-500/30">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-sm text-slate-100">
                Administrative Approval Authority
              </h4>
              <p className="text-xs text-slate-400">
                Review hard constraint checks and authorize booking ticket
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="emerald"
                disabled={isSelfRequest}
                onClick={handleApprove}
                icon={CheckCircle2}
              >
                Approve Booking
              </Button>
              <Button
                variant="danger"
                onClick={() => setShowRejectBox(!showRejectBox)}
                icon={XCircle}
              >
                Reject with Reason
              </Button>
            </div>
          </div>

          {/* Inline Rejection Box */}
          {showRejectBox && (
            <div className="p-4 bg-slate-950 rounded-xl border border-red-500/30 space-y-3 text-xs animate-fade-in">
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">
                  Mandatory Rejection Reason
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Venue reserved for university placement orientation"
                  rows={2}
                  className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">
                  Recommend Alternate Hall
                </label>
                <select
                  value={altRoom}
                  onChange={(e) => setAltRoom(e.target.value)}
                  className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-none"
                >
                  {ROOMS.filter((r) => r.id !== booking.room).map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.type}, {r.capacity} seats) — {r.building}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={() => setShowRejectBox(false)}>
                  Cancel
                </Button>
                <Button variant="danger" size="sm" onClick={handleReject}>
                  Confirm Rejection
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
