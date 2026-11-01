// src/features/bookings/BookingDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ROOMS } from '@/data/demoData';
import { useBookingStore } from '@/store/bookingStore';
import { useAuthStore } from '@/store/authStore';
import { bookingService } from '@/services/bookingService';
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
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { Badge, Button, Card, PageHeader, StatusBadge, DemoBanner } from '@/components/common';
import { useToast } from '@/components/common/Toaster';

export default function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user, canApprove } = useAuthStore();
  const { bookings, approveBooking, rejectBooking } = useBookingStore();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [rejectReason, setRejectReason] = useState('');
  const [altRoom, setAltRoom] = useState('SH-2');
  const [showRejectBox, setShowRejectBox] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      const existing = bookings.find((b) => b.id === id);
      if (existing) {
        setBooking(existing);
        setLoading(false);
        return;
      }
      try {
        const res = await bookingService.getBooking(id);
        if (res?.data) {
          setBooking(res.data);
        } else {
          setError('Booking not found');
        }
      } catch (e) {
        setError(e.message || 'Error loading booking');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, bookings]);

  if (loading) {
    return (
      <Card className="p-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
        Loading booking details from server...
      </Card>
    );
  }

  if (error || !booking) {
    return (
      <Card className="p-8 text-center text-xs text-rose-400 bg-rose-950/20">
        {error || 'Booking request not found'}
      </Card>
    );
  }

  const roomObj = ROOMS.find((r) => r.id === booking.room);

  // Self-approval check (Section 2 rule: Nobody can approve their own request)
  const isSelfRequest =
    booking.requestedBy === user?.role ||
    (user?.role === 'admin' && booking.requestedBy === 'admin') ||
    booking.requestedBy === user?.email ||
    booking.requestedBy === user?.name;

  const handleApprove = async () => {
    if (isSelfRequest) {
      toast.error('Permission Denied: Policy prohibits approving self-submitted requests.');
      return;
    }
    const placement = {
      room_id: booking.room !== 'TBD' ? booking.room : (booking.requested_room || 'L-101'),
      day: booking.day !== 'TBD' ? booking.day : (booking.windows?.[0]?.day || 'MON'),
      start_period: booking.assigned_start_period || booking.windows?.[0]?.from_period || 6,
      end_period: booking.assigned_end_period || booking.windows?.[0]?.to_period || 7,
      reason: 'Approved by authorized authority',
    };
    try {
      await approveBooking(booking.id, placement);
      setBooking((prev) => ({ ...prev, status: 'approved' }));
      toast.success(`Booking ${booking.id} approved successfully!`);
    } catch (e) {
      toast.error(e.message || 'Approval failed');
    }
  };

  const handleReject = async () => {
    try {
      await rejectBooking(
        booking.id,
        rejectReason || 'Venue allocated for academic priority schedule',
        { room_id: altRoom }
      );
      setBooking((prev) => ({ ...prev, status: 'rejected' }));
      setShowRejectBox(false);
      toast.info(`Booking rejected. Alternative ${altRoom} suggested.`);
    } catch (e) {
      toast.error(e.message || 'Rejection failed');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link to="/bookings" className="hover:text-blue-400 flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" />
          Back to Bookings
        </Link>
        <span>/</span>
        <span className="text-slate-200 font-medium">{booking.id}</span>
      </div>

      <PageHeader
        title={booking.title}
        subtitle={`Application filed by ${booking.requestedBy} (${booking.role || 'Member'})`}
        badge={<StatusBadge status={booking.status} />}
      >
        {canApprove && booking.status === 'pending' && (
          <div className="flex items-center gap-2">
            <Button
              variant="emerald"
              onClick={handleApprove}
              disabled={isSelfRequest}
              icon={CheckCircle2}
            >
              Approve Booking
            </Button>
            <Button
              variant="danger"
              onClick={() => setShowRejectBox(!showRejectBox)}
              icon={XCircle}
            >
              Reject / Offer Alt
            </Button>
          </div>
        )}
      </PageHeader>

      {/* Self-approval security callout */}
      {isSelfRequest && booking.status === 'pending' && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/30 flex items-center gap-3 text-xs text-amber-200">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
          <span>
            <strong>Anti-Conflict Policy Enforced:</strong> You submitted this application. Another administrator or authorized faculty member must approve this booking.
          </span>
        </div>
      )}

      {/* Rejection input box */}
      {showRejectBox && (
        <Card className="p-4 border-red-500/40 bg-red-950/20 space-y-3">
          <h4 className="font-bold text-xs text-red-300 uppercase tracking-wider">
            Rejection & Counter-Offer Specification
          </h4>
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">
              Reason for Decision
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Venue required for CSE401 Midsem Exam..."
              className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-red-500"
              rows={2}
            />
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">
              Suggest Feasible Alternative Room
            </label>
            <select
              value={altRoom}
              onChange={(e) => setAltRoom(e.target.value)}
              className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none"
            >
              {ROOMS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.type}, {r.capacity} seats) — {r.building}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button variant="ghost" size="sm" onClick={() => setShowRejectBox(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleReject}>
              Confirm Rejection & Counter-Offer
            </Button>
          </div>
        </Card>
      )}

      {/* Key Details Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-100">{booking.room}</div>
            <div className="text-xs text-slate-400">
              {roomObj ? `${roomObj.building} (Cap: ${roomObj.capacity})` : 'Assigned Venue'}
            </div>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-100">
              {booking.windows?.[0]?.date
                ? `${booking.windows[0].date} (${booking.day})`
                : booking.date
                ? `${booking.date} (${booking.day})`
                : booking.day}
            </div>
            <div className="text-xs text-slate-400">{booking.time}</div>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-100">
              {booking.attendance} Expected
            </div>
            <div className="text-xs text-slate-400">Category: {booking.category}</div>
          </div>
        </Card>
      </div>

      {/* Narrative Purpose */}
      {booking.raw_text && (
        <Card className="p-5 space-y-2">
          <h4 className="font-bold text-xs uppercase text-slate-400 tracking-wider">
            Natural Language Application Brief
          </h4>
          <p className="text-xs text-slate-200 leading-relaxed italic bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            "{booking.raw_text}"
          </p>
        </Card>
      )}

      {/* Decision Metadata */}
      {booking.decisionReason && (
        <Card className="p-4 bg-slate-900/90 border-slate-700 space-y-1 text-xs">
          <span className="font-bold text-slate-300">Administrative Decision Note:</span>
          <p className="text-slate-400">{booking.decisionReason}</p>
        </Card>
      )}
    </div>
  );
}
