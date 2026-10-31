// src/features/campus/BuildingExplorer.jsx
import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { CAMPUS_BUILDINGS } from '@/data/campusLayout';
import { ROOMS } from '@/data/demoData';
import {
  Building2,
  ChevronLeft,
  ArrowRight,
  Layers,
  Users,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  CalendarDays,
  Info,
} from 'lucide-react';
import { Badge, Button, StatusBadge, PageHeader, Card } from '@/components/common';

export default function BuildingExplorer() {
  const { buildingId } = useParams();
  const navigate = useNavigate();

  const building =
    CAMPUS_BUILDINGS.find((b) => b.id === buildingId) || CAMPUS_BUILDINGS[0];

  const buildingRooms = ROOMS.filter((r) => r.building === building.name);
  const [selectedFloor, setSelectedFloor] = useState(building.floors[0] || 1);

  const floorRooms = buildingRooms.filter((r) => r.floor === selectedFloor);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link to="/campus" className="hover:text-blue-400 flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" />
          Back to Campus Map
        </Link>
        <span>/</span>
        <span className="text-slate-200 font-medium">{building.name}</span>
      </div>

      <PageHeader
        title={building.name}
        subtitle={building.description}
        badge={
          <Badge variant="blue" size="md">
            {building.dept}
          </Badge>
        }
      >
        <Button
          variant="primary"
          onClick={() => navigate(`/campus/${building.id}/floor/${selectedFloor}`)}
        >
          <span>Open Floor {selectedFloor} Plan</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </PageHeader>

      {/* 3D Static Model vs Dynamic Occupancy Notice */}
      <div className="flex items-center gap-2 p-3 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-slate-400">
        <Info className="w-4 h-4 text-blue-400 shrink-0" />
        <span>
          <strong>Campus Architecture Notice:</strong> 3D building and floor geometries represent static campus architectural models, while venue occupancy and availability details are loaded dynamically from live server telemetry (<code className="text-blue-300">/rooms/&#123;id&#125;/availability</code>).
        </span>
      </div>

      {/* Building Stats Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-xl">
            {building.icon}
          </div>
          <div>
            <div className="text-xl font-bold text-slate-100">{building.floors.length}</div>
            <div className="text-xs text-slate-400">Total Floors</div>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-100">{buildingRooms.length}</div>
            <div className="text-xs text-slate-400">Classrooms & Labs</div>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-emerald-400">
              {buildingRooms.filter((r) => r.status === 'available').length}
            </div>
            <div className="text-xs text-slate-400">Currently Available</div>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-100">
              {buildingRooms.reduce((acc, r) => acc + r.capacity, 0)}
            </div>
            <div className="text-xs text-slate-400">Total Seating Capacity</div>
          </div>
        </Card>
      </div>

      {/* Floor Explorer Section */}
      <Card className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-100">Select Floor Level</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Choose a floor to explore classrooms, labs, and interactive architectural layouts
            </p>
          </div>

          <div className="flex gap-2">
            {building.floors.map((floor) => (
              <button
                key={floor}
                onClick={() => setSelectedFloor(floor)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  selectedFloor === floor
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                Floor {floor}
              </button>
            ))}
          </div>
        </div>

        {/* Room grid on selected floor */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {floorRooms.length === 0 ? (
            <div className="col-span-full py-12 text-center text-sm text-slate-500">
              No rooms registered on Floor {selectedFloor}
            </div>
          ) : (
            floorRooms.map((room) => (
              <div
                key={room.id}
                onClick={() =>
                  navigate(
                    `/campus/${building.id}/floor/${room.floor}/room/${room.id}`
                  )
                }
                className="p-4 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-700/60 hover:border-blue-500/60 cursor-pointer transition-all duration-200 group flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-slate-100 group-hover:text-blue-400 transition-colors">
                      {room.name}
                    </h4>
                    <span className="text-xs text-slate-400">{room.type}</span>
                  </div>
                  <StatusBadge status={room.status} />
                </div>

                <div className="text-xs text-slate-400 flex items-center justify-between pt-2 border-t border-slate-800">
                  <span>Capacity: {room.capacity} seats</span>
                  <span>{room.accessible ? '♿ Accessible' : 'Standard'}</span>
                </div>

                <div className="flex items-center justify-between text-xs font-medium text-blue-400 pt-1">
                  <span>Inspect Schedule</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
