// src/features/admin/AnalyticsDashboard.jsx
import React, { useState, useEffect } from 'react';
import { analyticsService } from '@/services/analyticsService';
import {
  ROOMS,
  SESSIONS,
  ANALYTICS,
  COURSES,
  STUDENT_GROUPS,
  FACULTY
} from '@/data/demoData';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import {
  BarChart3,
  Download,
  Filter,
  Calendar,
  Building,
  TrendingUp,
  Layers,
  ArrowUpRight,
  ShieldCheck
} from 'lucide-react';
import { Badge, Button, Card, PageHeader, DemoBanner } from '@/components/common';
import { useToast } from '@/components/common/Toaster';

export default function AnalyticsDashboard() {
  const toast = useToast();
  const [selectedRange, setSelectedRange] = useState('Week 1');
  const [resourceMetrics, setResourceMetrics] = useState(null);

  useEffect(() => {
    async function loadMetrics() {
      try {
        const resp = await analyticsService.getResources();
        if (resp.data) {
          setResourceMetrics(resp.data);
        }
      } catch (err) {
        console.warn('Could not load live analytics:', err);
      }
    }
    loadMetrics();
  }, []);

  const handleExportCSV = () => {
    toast.success('Analytics report exported as CSV (Demo)');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campus Institutional Analytics"
        subtitle="Long-term venue load telemetry, conflict frequency reduction, and faculty workload distribution"
        badge={<DemoBanner text="Campus Telemetry & OR-Tools Solver Statistics" />}
      >
        <Button variant="outline" onClick={handleExportCSV} icon={Download}>
          Export CSV Report
        </Button>
      </PageHeader>

      {/* Row 1: Big KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <span className="text-xs text-slate-400 block uppercase font-semibold">Average Venue Load</span>
          <span className="text-2xl font-black text-slate-100 mt-1 block">72.4%</span>
          <span className="text-[11px] text-emerald-400 font-medium">↑ 4.1% over last term</span>
        </Card>

        <Card className="p-4">
          <span className="text-xs text-slate-400 block uppercase font-semibold">Scheduled Hours</span>
          <span className="text-2xl font-black text-[#B8F36B] mt-1 block">189 hrs/wk</span>
          <span className="text-[11px] text-slate-500">Distributed Mon–Fri</span>
        </Card>

        <Card className="p-4">
          <span className="text-xs text-slate-400 block uppercase font-semibold">Unresolved Clashes</span>
          <span className="text-2xl font-black text-emerald-400 mt-1 block">0 Timetable Clashes</span>
          <span className="text-[11px] text-emerald-400 font-medium">100% hard satisfaction</span>
        </Card>

        <Card className="p-4">
          <span className="text-xs text-slate-400 block uppercase font-semibold">Faculty Hours / Wk</span>
          <span className="text-2xl font-black text-purple-400 mt-1 block">4.7 hrs avg</span>
          <span className="text-[11px] text-slate-500">Max limit: 12 hrs/wk</span>
        </Card>
      </div>

      {/* Row 2: Charts (Utilisation + Session Split) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-100">
                Venue Utilisation % by Building
              </h3>
              <p className="text-xs text-slate-400">
                Calculated from weekly occupied teaching hours vs total available hours
              </p>
            </div>
            <Badge variant="blue" size="sm">
              7 Blocks Audited
            </Badge>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ANALYTICS.roomUtilisation}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#090E1A',
                    borderColor: '#1E293B',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#F8FAFC',
                  }}
                />
                <Bar dataKey="utilisation" fill="#6366F1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Donut Chart */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-100 mb-1">
              Curricular Session Types
            </h3>
            <p className="text-xs text-slate-400 mb-3">189 Total Weekly Hours</p>

            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ANALYTICS.sessionTypes}
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {ANALYTICS.sessionTypes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-800 text-xs">
              {ANALYTICS.sessionTypes.map((t) => (
                <div key={t.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: t.color }}
                    />
                    <span className="text-slate-300">{t.name}</span>
                  </div>
                  <span className="font-bold text-slate-100">{t.value} hrs</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Row 3: Load curve + Conflict reduction timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <h3 className="font-bold text-sm text-slate-100 mb-1">
            Weekly Daily Load Trend
          </h3>
          <p className="text-xs text-slate-400 mb-4">Hours scheduled per weekday</p>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ANALYTICS.weeklyLoad}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#090E1A',
                    borderColor: '#1E293B',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#F8FAFC',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="utilisation"
                  stroke="#06B6D4"
                  fill="#06B6D4"
                  fillOpacity={0.25}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-bold text-sm text-slate-100 mb-1">
            Scheduling Conflict Reduction
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Conflicts detected vs iterations solved
          </p>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ANALYTICS.conflictTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="week" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#090E1A',
                    borderColor: '#1E293B',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#F8FAFC',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="conflicts"
                  stroke="#F43F5E"
                  strokeWidth={2.5}
                  dot={{ fill: '#F43F5E', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Row 4: Complete 27-Room Utilisation Table */}
      <Card className="p-5 space-y-4">
        <h3 className="font-bold text-sm text-slate-100">
          Individual Room Occupancy Audit (All 27 CIT Venues)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-2.5 px-3">Room Code</th>
                <th className="py-2.5 px-3">Building</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Capacity</th>
                <th className="py-2.5 px-3">Accessibility</th>
                <th className="py-2.5 px-3">Weekly Hours</th>
                <th className="py-2.5 px-3">Occupancy Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {ROOMS.map((room) => {
                const count = SESSIONS.filter((s) => s.room === room.id).length;
                return (
                  <tr key={room.id} className="hover:bg-slate-800/50">
                    <td className="py-2.5 px-3 font-bold text-slate-200">{room.name}</td>
                    <td className="py-2.5 px-3 text-slate-400">{room.building}</td>
                    <td className="py-2.5 px-3 text-slate-300">{room.type}</td>
                    <td className="py-2.5 px-3 text-slate-300">{room.capacity} seats</td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {room.accessible ? '♿ Accessible' : 'Standard'}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-teal-400">{count} hrs</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium capitalize ${
                          room.status === 'available'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : room.status === 'occupied'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {room.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
