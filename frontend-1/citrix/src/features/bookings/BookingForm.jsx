// src/features/bookings/BookingForm.jsx
import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ROOMS } from '@/data/demoData';
import { useBookingStore } from '@/store/bookingStore';
import { useAuthStore } from '@/store/authStore';
import {
  CalendarCheck2,
  Building,
  Users,
  Clock,
  Sparkles,
  Info,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { Badge, Button, Card, PageHeader, DemoBanner } from '@/components/common';
import { useToast } from '@/components/common/Toaster';

export default function BookingForm() {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const initialRoom = searchParams.get('room') || 'A101';

  const { user } = useAuthStore();
  const { submitBooking } = useBookingStore();

  const [title, setTitle] = useState('');
  const [room, setRoom] = useState(initialRoom);
  const [date, setDate] = useState('2026-11-09');
  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState('16:00');
  const [attendees, setAttendees] = useState(50);
  const [purpose, setPurpose] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedRoomObj = ROOMS.find((r) => r.id === room);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Please enter an event title');
      return;
    }
    setSubmitting(true);

    try {
      await submitBooking({
        title,
        room,
        date,
        startTime,
        endTime,
        attendees: Number(attendees),
        purpose: purpose || 'Academic / Club Session',
        requestedBy: user?.role || 'faculty',
        type: 'manual',
      });

      toast.success('Venue booking submitted for Dean’s Office approval!');
      navigate('/bookings');
    } catch (err) {
      toast.error('Failed to submit booking');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Manual Campus Venue Reservation"
        subtitle="Reserve lecture halls, auditoriums, or computer labs with instant capacity and facility verification"
        badge={<DemoBanner text="Standard Institutional Booking Form" />}
      />

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-slate-300">Event / Session Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Extra Lecture on Distributed OS / Cultural Rehearsal"
              className="w-full p-2.5 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Select Campus Venue</label>
              <select
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                className="w-full p-2.5 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-100 text-xs focus:outline-none"
              >
                {ROOMS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.type}, {r.capacity} seats) — {r.building}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2.5 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-100 text-xs focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Start Time</label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full p-2.5 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-100 text-xs focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">End Time</label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full p-2.5 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-100 text-xs focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Estimated Attendees</label>
              <input
                type="number"
                required
                value={attendees}
                onChange={(e) => setAttendees(e.target.value)}
                className="w-full p-2.5 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-100 text-xs focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Venue Capacity Feedback</label>
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-slate-300 flex items-center justify-between">
                <span>Room Capacity: {selectedRoomObj?.capacity} Seats</span>
                {attendees <= (selectedRoomObj?.capacity || 0) ? (
                  <span className="text-emerald-400 font-bold">✓ Sufficient</span>
                ) : (
                  <span className="text-red-400 font-bold">⚠ Overcrowded</span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-300">Purpose / Academic Activity Description</label>
            <textarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              rows={3}
              placeholder="Provide context regarding curriculum coverage or club event scope..."
              className="w-full p-2.5 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-100 text-xs focus:outline-none"
            />
          </div>

          <div className="p-3 bg-blue-950/20 border border-blue-500/30 rounded-xl text-[11px] text-blue-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-400 shrink-0" />
              <span>
                Want to book via natural language? Use the Smart AI Prompt Composer!
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => navigate('/bookings/new/nl')}
              className="text-[10px] py-1 h-auto"
            >
              Open AI Composer
            </Button>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <Button variant="ghost" type="button" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={submitting}>
              Submit Reservation
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
