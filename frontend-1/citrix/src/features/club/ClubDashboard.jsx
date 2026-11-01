// src/features/club/ClubDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useBookingStore } from '@/store/bookingStore';
import { dashboardService } from '@/services/dashboardService';
import { SPECTRA_EVENTS, ROOMS } from '@/data/demoData';
import {
  Sparkles,
  CalendarCheck2,
  Building,
  Layers,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  PlusCircle,
  Boxes,
  HelpCircle
} from 'lucide-react';
import { Badge, Button, Card, PageHeader, DemoBanner, StatusBadge } from '@/components/common';

export default function ClubDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { bookings } = useBookingStore();
  const [clubData, setClubData] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const resp = await dashboardService.getClubDashboard();
        if (resp.data) {
          setClubData(resp.data);
        }
      } catch (err) {
        console.warn('Could not load live club dashboard:', err);
      }
    }
    loadData();
  }, []);

  const mySpectraEvents = SPECTRA_EVENTS.filter((e) => e.club.includes('Robotics'));

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Club Hub: ${user?.name || 'Aryan Mehta'}`}
        subtitle={`${user?.designation || 'Club Representative, Robotics Club'} — Venue bookings, natural-language requests, and Spectra proposals`}
        badge={
          <Badge variant="amber" size="md">
            STUDENT CLUB REPRESENTATIVE
          </Badge>
        }
      >
        <Button
          variant="primary"
          onClick={() => navigate('/bookings/new/nl')}
          icon={Sparkles}
        >
          Smart Natural-Language Booking
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate('/bookings/new')}
          icon={CalendarCheck2}
        >
          Manual Venue Form
        </Button>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <span className="text-xs text-slate-400 block uppercase font-semibold">Active Bookings</span>
          <span className="text-2xl font-black text-slate-100 mt-1 block">3 Proposals</span>
          <span className="text-[11px] text-amber-400 font-medium">1 Pending Approval</span>
        </Card>

        <Card className="p-4">
          <span className="text-xs text-slate-400 block uppercase font-semibold">Spectra Week Status</span>
          <span className="text-2xl font-black text-[#B8F36B] mt-1 block">SP001 Queued</span>
          <span className="text-[11px] text-slate-500">CS-L3 requested (Nov 8)</span>
        </Card>

        <Card className="p-4">
          <span className="text-xs text-slate-400 block uppercase font-semibold">Club Priority Rank</span>
          <span className="text-2xl font-black text-purple-400 mt-1 block">Priority 3</span>
          <span className="text-[11px] text-purple-300">Technical Club Tier</span>
        </Card>

        <Card className="p-4">
          <span className="text-xs text-slate-400 block uppercase font-semibold">Approved Venues</span>
          <span className="text-2xl font-black text-emerald-400 mt-1 block">1 Confirmed</span>
          <span className="text-[11px] text-emerald-400 font-medium">A-101 (Orientation)</span>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Submitted Bookings & Rejected Feedback */}
        <div className="lg:col-span-2 space-y-5">
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-100">
                  My Club Booking Applications
                </h3>
                <p className="text-xs text-slate-400">
                  Track Dean’s office decisions and suggested alternative halls
                </p>
              </div>
              <Link
                to="/bookings"
                className="text-xs text-[#B8F36B] hover:text-[#B8F36B] font-semibold flex items-center gap-1"
              >
                All Bookings <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {/* Proposal 1: Pending */}
              <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2 text-xs">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-bold text-slate-100 text-sm">
                      Hands-On Robotics Workshop (SP001)
                    </span>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Requested: CS Lab 3 (CS-L3) • Nov 8, 10:00 - 13:00 • 80 Attendees
                    </div>
                  </div>
                  <Badge variant="amber" size="sm">
                    Pending Dean Review
                  </Badge>
                </div>
                <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span>Priority Tier: Medium (Technical Club)</span>
                  <span className="text-teal-400">No Hard Clashes Detected</span>
                </div>
              </div>

              {/* Proposal 2: Rejected with Suggested Alternative */}
              <div className="p-4 bg-red-950/20 rounded-xl border border-red-500/30 space-y-2 text-xs">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-bold text-slate-100 text-sm">
                      Autonomous Rover Demonstration
                    </span>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Requested: Seminar Hall 1 (SH-1) • Nov 10, 16:00 - 18:00
                    </div>
                  </div>
                  <Badge variant="red" size="sm">
                    Rejected by Dean
                  </Badge>
                </div>

                <div className="p-3 bg-[#080A09]/80 rounded-lg border border-slate-800 text-slate-300 space-y-1">
                  <div className="text-red-400 font-semibold">
                    Rejection Reason:
                  </div>
                  <p className="text-[11px]">
                    SH-1 occupied by scheduled academic tutorial and makeup exams.
                  </p>
                  <div className="pt-1.5 flex items-center justify-between text-teal-400 font-semibold">
                    <span>Suggested Alternative: Seminar Hall 2 (SH-2)</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/bookings/new?room=SH-2')}
                      className="text-[10px] py-1 h-auto"
                    >
                      Book SH-2 Instead
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right 1 Col: Quick Venue Discovery */}
        <div className="space-y-5">
          <Card className="p-5 space-y-3">
            <h3 className="font-bold text-sm text-slate-100 uppercase tracking-wider">
              Quick Venue Discovery
            </h3>
            <p className="text-xs text-slate-400">
              Browse campus auditoriums, seminar halls, and computer laboratories:
            </p>

            <div className="space-y-2">
              <Button
                variant="primary"
                className="w-full justify-start text-xs"
                onClick={() => navigate('/bookings/new/nl')}
                icon={Sparkles}
              >
                Express Booking in English/Hinglish
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-xs"
                onClick={() => navigate('/campus')}
                icon={Boxes}
              >
                Inspect 3D Campus Venues
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-xs"
                onClick={() => navigate('/rooms')}
                icon={Building}
              >
                Search Free Venues Today
              </Button>
            </div>
          </Card>

          {/* Popular Club Venues */}
          <Card className="p-5 space-y-3">
            <h3 className="font-bold text-sm text-slate-100">
              Popular Club Venues
            </h3>
            <div className="space-y-2 text-xs">
              <div className="p-2.5 bg-slate-900 rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-200">Main Auditorium (AUD-1)</div>
                  <div className="text-[10px] text-slate-500">600 Seats • Full Stage &amp; PA</div>
                </div>
                <Badge variant="green" size="sm">Available</Badge>
              </div>

              <div className="p-2.5 bg-slate-900 rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-200">Open Air Theatre (OD-1)</div>
                  <div className="text-[10px] text-slate-500">500 Capacity • Cultural Shows</div>
                </div>
                <Badge variant="green" size="sm">Available</Badge>
              </div>

              <div className="p-2.5 bg-slate-900 rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-200">Seminar Hall 1 (SH-1)</div>
                  <div className="text-[10px] text-slate-500">150 Seats • Projector &amp; AC</div>
                </div>
                <Badge variant="amber" size="sm">Partial</Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
