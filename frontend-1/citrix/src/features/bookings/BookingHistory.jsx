// src/features/bookings/BookingHistory.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useBookingStore } from '@/store/bookingStore';
import { useAuthStore } from '@/store/authStore';
import { ROOMS } from '@/data/demoData';
import {
  Layers,
  Search,
  Filter,
  PlusCircle,
  Calendar,
  Clock,
  Building,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { Badge, Button, Card, PageHeader, DemoBanner, StatusBadge } from '@/components/common';

export default function BookingHistory() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { bookings, loading, error, fetchBookings } = useBookingStore();

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const allBookings = bookings || [];

  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBookings = allBookings.filter((b) => {
    if (activeTab === 'pending') return b.status === 'pending';
    if (activeTab === 'approved') return b.status === 'approved';
    if (activeTab === 'rejected') return b.status === 'rejected';

    if (searchQuery) {
      return (
        b.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.room?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.raw_text || b.purpose || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Venue Bookings Registry"
        subtitle="Comprehensive log of academic extra-classes, society seminars, and institutional room allocations"
        badge={<DemoBanner text="Live Synchronized Booking Store" />}
      >
        <Button
          variant="primary"
          onClick={() => navigate('/bookings/new/nl')}
          icon={Sparkles}
        >
          Smart AI Booking
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate('/bookings/new')}
          icon={PlusCircle}
        >
          Manual Reservation
        </Button>
      </PageHeader>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {['all', 'pending', 'approved', 'rejected'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                activeTab === tab
                  ? 'bg-[#B8F36B] text-[#101110] font-bold shadow-glow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {tab} ({
                tab === 'all'
                  ? allBookings.length
                  : allBookings.filter((b) => b.status === tab).length
              })
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search booking title, room..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Bookings Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Event Title</th>
                <th className="py-3 px-4">Venue</th>
                <th className="py-3 px-4">Date &amp; Time</th>
                <th className="py-3 px-4">Requested By</th>
                <th className="py-3 px-4">Attendees</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-[#B8F36B]" />
                      Loading bookings from server...
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-rose-400 bg-rose-950/20">
                    Error loading bookings: {error}
                  </td>
                </tr>
              ) : filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No bookings found matching current filter.
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => {
                const roomObj = ROOMS.find((r) => r.id === b.room);

                return (
                  <tr key={b.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-100">{b.title}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{b.id} • {b.purpose}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-200">{b.room}</span>
                      <span className="text-[10px] text-slate-500 block truncate max-w-[140px]">
                        {roomObj?.building || 'Campus'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      <div>{b.date}</div>
                      <div className="text-[11px] text-teal-400 font-mono">
                        {b.startTime} - {b.endTime}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-300 capitalize">
                      {b.requestedBy}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {b.attendees} pax
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={b.status} />
                      {b.rejectedReason && (
                        <span className="text-[10px] text-red-400 block truncate max-w-[120px]" title={b.rejectedReason}>
                          {b.rejectedReason}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/bookings/${b.id}`}
                        className="text-xs text-[#B8F36B] hover:text-[#B8F36B] font-semibold inline-flex items-center gap-1"
                      >
                        Inspect <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
