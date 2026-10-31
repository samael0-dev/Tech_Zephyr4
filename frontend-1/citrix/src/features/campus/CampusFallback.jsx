// src/features/campus/CampusFallback.jsx
import React from 'react';
import { CAMPUS_BUILDINGS } from '@/data/campusLayout';
import { ROOMS } from '@/data/demoData';
import { Badge, Button } from '@/components/common';
import { Building, Layers, Users, ArrowRight, ShieldCheck } from 'lucide-react';

export default function CampusFallback({ onSelectBuilding, selectedBuilding }) {
  // Get room count per building
  const getBuildingStats = (buildingName) => {
    const bRooms = ROOMS.filter((r) => r.building === buildingName);
    const available = bRooms.filter((r) => r.status === 'available').length;
    const occupied = bRooms.filter((r) => r.status === 'occupied').length;
    const partial = bRooms.filter((r) => r.status === 'partial').length;
    return { total: bRooms.length, available, occupied, partial };
  };

  return (
    <div className="w-full h-full bg-[#080E1A] p-6 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Building className="w-5 h-5 text-blue-400" />
              CIT Campus Building Directory (2D Plan)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Architectural campus grid view with live floor counts and room availability metrics
            </p>
          </div>
          <Badge variant="teal" size="sm">
            Illustrative campus layout
          </Badge>
        </div>

        {/* Building Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {CAMPUS_BUILDINGS.map((b) => {
            const stats = getBuildingStats(b.name);
            const isSelected = selectedBuilding?.id === b.id;

            return (
              <div
                key={b.id}
                onClick={() => onSelectBuilding(b)}
                className={`group relative bg-slate-900/90 border rounded-2xl p-5 cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                  isSelected
                    ? 'border-blue-500 bg-slate-800/90 shadow-xl shadow-blue-500/10'
                    : 'border-slate-800 hover:border-slate-700 hover:bg-slate-800/60'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center text-2xl shadow-inner">
                      {b.icon}
                    </div>
                    <Badge variant={stats.available > 0 ? 'green' : 'amber'} size="sm">
                      {stats.available} Available
                    </Badge>
                  </div>

                  <h4 className="text-base font-bold text-slate-100 group-hover:text-blue-400 transition-colors">
                    {b.name}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {b.description}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-800/50 rounded-lg p-2">
                      <div className="text-xs font-bold text-slate-200">{b.floors.length}</div>
                      <div className="text-[10px] text-slate-400 uppercase">Floors</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-2">
                      <div className="text-xs font-bold text-emerald-400">{stats.total}</div>
                      <div className="text-[10px] text-slate-400 uppercase">Rooms</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-2">
                      <div className="text-xs font-bold text-blue-400">{b.dept.split(',')[0]}</div>
                      <div className="text-[10px] text-slate-400 uppercase">Dept</div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs font-semibold text-blue-400 group-hover:text-blue-300">
                  <span>Explore Floors & Classrooms</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
