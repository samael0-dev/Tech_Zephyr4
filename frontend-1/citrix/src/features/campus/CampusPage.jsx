// src/features/campus/CampusPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CampusScene from './CampusScene';
import CampusFallback from './CampusFallback';
import { CAMPUS_BUILDINGS } from '@/data/campusLayout';
import { ROOMS } from '@/data/demoData';
import {
  Boxes,
  Layers,
  Building2,
  X,
  ArrowRight,
  Compass,
  RotateCcw,
  CheckCircle2,
  SlidersHorizontal,
  ChevronRight,
  Sparkles,
  Info
} from 'lucide-react';
import { Badge, Button, StatusBadge } from '@/components/common';

export default function CampusPage() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState('3d'); // '3d' or '2d'
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [activeFloor, setActiveFloor] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');

  const buildingRooms = selectedBuilding
    ? ROOMS.filter((r) => r.building === selectedBuilding.name)
    : [];

  const filteredRooms = buildingRooms.filter((r) => {
    if (statusFilter === 'available') return r.status === 'available';
    if (statusFilter === 'occupied') return r.status === 'occupied';
    return true;
  });

  const handleEnterFloor = (floorNum) => {
    if (!selectedBuilding) return;
    navigate(`/campus/${selectedBuilding.id}/floor/${floorNum}`);
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col rounded-2xl overflow-hidden border border-slate-800 bg-[#080A09] relative shadow-2xl">
      {/* Top Campus Control Bar */}
      <div className="h-14 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md px-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Boxes className="w-5 h-5 text-[#B8F36B]" />
            <h2 className="font-bold text-sm sm:text-base text-slate-100">
              Interactive CIT Campus
            </h2>
          </div>
          <Badge variant="teal" size="sm" className="hidden sm:inline-flex">
            Illustrative campus layout
          </Badge>
        </div>

        {/* View Mode Toggle & Status Filter */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center bg-slate-800/90 p-1 rounded-xl border border-slate-700/60">
            <button
              onClick={() => setViewMode('3d')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                viewMode === '3d'
                  ? 'bg-[#B8F36B] text-[#101110] font-bold shadow-glow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              3D Campus
            </button>
            <button
              onClick={() => setViewMode('2d')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                viewMode === '2d'
                  ? 'bg-[#B8F36B] text-[#101110] font-bold shadow-glow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              2D Plan
            </button>
          </div>

          {selectedBuilding && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedBuilding(null)}
              icon={RotateCcw}
              className="hidden md:inline-flex text-xs"
            >
              Reset View
            </Button>
          )}
        </div>
      </div>

      {/* Main Campus Scene Container */}
      <div className="flex-1 relative overflow-hidden">
        {viewMode === '3d' ? (
          <CampusScene
            selectedBuilding={selectedBuilding}
            onSelectBuilding={(b) => {
              setSelectedBuilding(b);
              setActiveFloor(b.floors[0] || 1);
            }}
          />
        ) : (
          <CampusFallback
            selectedBuilding={selectedBuilding}
            onSelectBuilding={(b) => {
              setSelectedBuilding(b);
              setActiveFloor(b.floors[0] || 1);
            }}
          />
        )}

        {/* Selected Building Details Drawer */}
        {selectedBuilding && (
          <div className="absolute top-4 right-4 bottom-4 w-80 sm:w-96 bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-xl z-30 flex flex-col overflow-hidden animate-slide-in-right">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-900 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{selectedBuilding.icon}</span>
                  <h3 className="font-bold text-base text-slate-100">
                    {selectedBuilding.name}
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Departments: {selectedBuilding.dept}
                </p>
              </div>
              <button
                onClick={() => setSelectedBuilding(null)}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Floor Selector Tabs */}
            <div className="p-4 border-b border-slate-800 bg-[#080A09]/40">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Select Floor to Inspect
              </label>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {selectedBuilding.floors.map((floor) => (
                  <button
                    key={floor}
                    onClick={() => setActiveFloor(floor)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      activeFloor === floor
                        ? 'bg-[#B8F36B] text-[#101110] font-bold shadow-glow-sm'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    Floor {floor}
                  </button>
                ))}
              </div>

              <Button
                variant="teal"
                size="sm"
                className="w-full mt-3 text-xs"
                onClick={() => handleEnterFloor(activeFloor)}
              >
                <span>Enter Top-Down Floor Plan</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Rooms list on this floor */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="font-semibold uppercase tracking-wider">
                  Rooms on Floor {activeFloor}
                </span>
                <span className="text-slate-500">
                  {
                    buildingRooms.filter((r) => r.floor === activeFloor).length
                  } total
                </span>
              </div>

              {buildingRooms.filter((r) => r.floor === activeFloor).length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500">
                  No classroom records on this level
                </div>
              ) : (
                buildingRooms
                  .filter((r) => r.floor === activeFloor)
                  .map((room) => (
                    <div
                      key={room.id}
                      onClick={() =>
                        navigate(
                          `/campus/${selectedBuilding.id}/floor/${room.floor}/room/${room.id}`
                        )
                      }
                      className="p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-600 cursor-pointer transition-all flex items-center justify-between group"
                    >
                      <div>
                        <div className="font-bold text-xs text-slate-200 group-hover:text-[#B8F36B] transition-colors">
                          {room.name}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {room.type} • {room.capacity} seats
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={room.status} />
                        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  ))
              )}
            </div>

            {/* Footer with hint */}
            <div className="p-3 bg-[#080A09]/80 border-t border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
              <Info className="w-4 h-4 text-[#B8F36B] shrink-0" />
              <span>Click any classroom to see live timetable and booking slots</span>
            </div>
          </div>
        )}

        {/* Legend Overlay at bottom-left */}
        <div className="absolute bottom-4 left-4 bg-[#121614]/90 border border-[#1F2420] rounded-xl px-3 py-2 backdrop-blur-md shadow-lg z-20 flex items-center gap-3 text-xs text-slate-300">
          <span className="font-semibold text-[#777D78] text-[11px] uppercase tracking-wider font-mono">
            Legend:
          </span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
            <span>Occupied</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
            <span>Partial</span>
          </div>
        </div>
      </div>
    </div>
  );
}
