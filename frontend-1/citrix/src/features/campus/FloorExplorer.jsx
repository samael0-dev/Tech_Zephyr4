// src/features/campus/FloorExplorer.jsx
import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { CAMPUS_BUILDINGS, FLOOR_LAYOUTS } from '@/data/campusLayout';
import { ROOMS } from '@/data/demoData';
import {
  Building2,
  ChevronLeft,
  Layers,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Info,
  Calendar,
  Sparkles,
  ArrowRight,
  Maximize2
} from 'lucide-react';
import { Badge, Button, StatusBadge, PageHeader, Card } from '@/components/common';

export default function FloorExplorer() {
  const { buildingId, floor } = useParams();
  const navigate = useNavigate();
  const floorNum = parseInt(floor, 10) || 1;

  const building =
    CAMPUS_BUILDINGS.find((b) => b.id === buildingId) || CAMPUS_BUILDINGS[0];

  const layoutKey = `${building.id}-${floorNum}`;
  const customLayout = FLOOR_LAYOUTS[layoutKey];

  const buildingRooms = ROOMS.filter(
    (r) => r.building === building.name && r.floor === floorNum
  );

  const [selectedRoom, setSelectedRoom] = useState(buildingRooms[0] || null);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Fallback layout generation if specific floor JSON isn't predefined
  const roomsToRender = customLayout
    ? customLayout.rooms.map((cr) => {
        const found = ROOMS.find((r) => r.id === cr.id);
        return {
          ...cr,
          status: found?.status || cr.color || 'available',
          roomData: found,
        };
      })
    : buildingRooms.map((r, idx) => ({
        id: r.id,
        x: 4 + (idx % 3) * 12,
        y: 3 + Math.floor(idx / 3) * 8,
        width: 10,
        height: 6,
        label: `${r.name}\n${r.capacity} seats`,
        status: r.status,
        roomData: r,
      }));

  const corridors = customLayout?.corridors || [
    { x: 2, y: 10, width: 36, height: 2 },
  ];

  const statusColors = {
    available: { fill: '#064e3b', stroke: '#10b981', text: '#6ee7b7' },
    occupied: { fill: '#7f1d1d', stroke: '#ef4444', text: '#fca5a5' },
    partial: { fill: '#78350f', stroke: '#f59e0b', text: '#fde68a' },
    admin: { fill: '#1e293b', stroke: '#64748b', text: '#cbd5e1' },
    utility: { fill: '#0f172a', stroke: '#334155', text: '#94a3b8' },
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link to="/campus" className="hover:text-[#B8F36B] flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" />
          Campus
        </Link>
        <span>/</span>
        <Link to={`/campus/${building.id}`} className="hover:text-[#B8F36B]">
          {building.name}
        </Link>
        <span>/</span>
        <span className="text-slate-200 font-medium">Floor {floorNum}</span>
      </div>

      <PageHeader
        title={`${building.name} — Floor ${floorNum}`}
        subtitle="Architectural top-down floor blueprint with real-time room availability"
        badge={
          <Badge variant="teal" size="sm">
            Top-down Interactive Blueprint
          </Badge>
        }
      >
        <div className="flex items-center gap-2">
          {building.floors.map((f) => (
            <Link
              key={f}
              to={`/campus/${building.id}/floor/${f}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                f === floorNum
                  ? 'bg-[#B8F36B] text-[#101110] font-bold shadow-glow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              Floor {f}
            </Link>
          ))}
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Architectural Interactive Blueprint SVG */}
        <div className="lg:col-span-2 space-y-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden relative shadow-2xl flex flex-col">
            {/* Blueprint Control Bar */}
            <div className="p-3 border-b border-slate-800 bg-[#080A09]/80 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                <span className="font-mono text-slate-300">
                  LEVEL {floorNum} BLUEPRINT — SCALE 1:100
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setZoomLevel((z) => Math.min(z + 0.2, 1.8))}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setZoomLevel((z) => Math.max(z - 0.2, 0.7))}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setZoomLevel(1)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                  title="Reset Zoom"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* SVG Floor Map */}
            <div className="p-6 overflow-auto bg-[#0A101D] flex items-center justify-center min-h-[420px] select-none">
              <svg
                viewBox="0 0 42 22"
                className="w-full h-auto max-w-2xl transition-transform duration-200"
                style={{ transform: `scale(${zoomLevel})` }}
              >
                {/* Architectural Grid pattern */}
                <defs>
                  <pattern id="archGrid" width="2" height="2" patternUnits="userSpaceOnUse">
                    <path
                      d="M 2 0 L 0 0 0 2"
                      fill="none"
                      stroke="rgba(255,255,255,0.04)"
                      strokeWidth="0.05"
                    />
                  </pattern>
                </defs>
                <rect width="42" height="22" fill="url(#archGrid)" />

                {/* Building Outer Perimeter Wall */}
                <rect
                  x="0.5"
                  y="0.5"
                  width="41"
                  height="21"
                  fill="none"
                  stroke="#334155"
                  strokeWidth="0.4"
                  rx="0.5"
                />

                {/* Corridors / Walkways */}
                {corridors.map((c, i) => (
                  <rect
                    key={`corr-${i}`}
                    x={c.x}
                    y={c.y}
                    width={c.width}
                    height={c.height}
                    fill="#151e2e"
                    stroke="#1e293b"
                    strokeWidth="0.1"
                  />
                ))}

                {/* Rooms as Interactive Rectangles */}
                {roomsToRender.map((r) => {
                  const isCurSelected = selectedRoom?.id === r.id;
                  const cStyle =
                    statusColors[r.status] || statusColors.available;

                  return (
                    <g
                      key={r.id}
                      onClick={() => {
                        const target =
                          r.roomData || ROOMS.find((rm) => rm.id === r.id);
                        if (target) setSelectedRoom(target);
                      }}
                      className="cursor-pointer group"
                    >
                      <rect
                        x={r.x}
                        y={r.y}
                        width={r.width}
                        height={r.height}
                        fill={isCurSelected ? '#1e3a8a' : cStyle.fill}
                        stroke={isCurSelected ? '#60a5fa' : cStyle.stroke}
                        strokeWidth={isCurSelected ? '0.3' : '0.15'}
                        rx="0.3"
                        className="transition-all duration-200"
                      />
                      {/* Door mark */}
                      <line
                        x1={r.x + r.width / 2 - 0.8}
                        y1={r.y + r.height}
                        x2={r.x + r.width / 2 + 0.8}
                        y2={r.y + r.height}
                        stroke="#94a3b8"
                        strokeWidth="0.25"
                      />
                      {/* Text label */}
                      <text
                        x={r.x + r.width / 2}
                        y={r.y + r.height / 2 - 0.2}
                        textAnchor="middle"
                        fill={isCurSelected ? '#ffffff' : cStyle.text}
                        fontSize="0.9"
                        fontWeight="bold"
                        className="pointer-events-none"
                      >
                        {r.id}
                      </text>
                      <text
                        x={r.x + r.width / 2}
                        y={r.y + r.height / 2 + 0.9}
                        textAnchor="middle"
                        fill="#94a3b8"
                        fontSize="0.65"
                        className="pointer-events-none"
                      >
                        {r.status?.toUpperCase()}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Status Legend at bottom of floorplan */}
            <div className="p-3 bg-[#080A09] border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 flex-wrap gap-2">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
                  <span>Available</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-red-500" />
                  <span>Occupied</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-amber-500" />
                  <span>Partial</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-slate-700 border border-slate-500" />
                  <span>Admin/Utility</span>
                </div>
              </div>
              <span className="text-[11px] text-slate-500">
                Click any classroom to inspect
              </span>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Selected Classroom Quick Inspector */}
        <div className="space-y-4">
          {selectedRoom ? (
            <Card className="p-5 space-y-4 border-[#B8F36B]/30">
              <div className="flex items-start justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                    {selectedRoom.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedRoom.building} • Floor {selectedRoom.floor}
                  </p>
                </div>
                <StatusBadge status={selectedRoom.status} />
              </div>

              {/* Quick specs */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block">Room Type</span>
                  <span className="font-semibold text-slate-200 mt-0.5 block">
                    {selectedRoom.type}
                  </span>
                </div>
                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block">Seating Capacity</span>
                  <span className="font-semibold text-slate-200 mt-0.5 block">
                    {selectedRoom.capacity} Seats
                  </span>
                </div>
                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block">Accessibility</span>
                  <span className="font-semibold text-slate-200 mt-0.5 block">
                    {selectedRoom.accessible ? '♿ Accessible' : 'Standard'}
                  </span>
                </div>
                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block">Current Status</span>
                  <span className="font-semibold text-slate-200 mt-0.5 block capitalize">
                    {selectedRoom.status}
                  </span>
                </div>
              </div>

              {/* Facilities Chips */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Facilities Available
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {selectedRoom.facilities?.map((f, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs border border-slate-700"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() =>
                    navigate(
                      `/campus/${building.id}/floor/${floorNum}/room/${selectedRoom.id}`
                    )
                  }
                >
                  <span>Open Full Room Timeline</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>

                <Button
                  variant="outline"
                  className="w-full text-xs"
                  onClick={() => navigate(`/bookings/new?room=${selectedRoom.id}`)}
                >
                  Book This Room
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="p-6 text-center text-sm text-slate-500">
              Select a room on the floor blueprint to inspect details
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
