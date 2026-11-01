// src/features/campus/RoomDetail.jsx
import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ROOMS, SESSIONS, COURSES, FACULTY } from '@/data/demoData';
import { CAMPUS_BUILDINGS } from '@/data/campusLayout';
import {
  Building2,
  ChevronLeft,
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Sparkles,
  Layers,
  Monitor,
  Wifi,
  Wind
} from 'lucide-react';
import { Badge, Button, StatusBadge, PageHeader, Card } from '@/components/common';
import { useAuthStore } from '@/store/authStore';

export default function RoomDetail() {
  const { buildingId, floor, roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const room = ROOMS.find((r) => r.id === roomId) || ROOMS[0];
  const building =
    CAMPUS_BUILDINGS.find((b) => b.id === buildingId) || CAMPUS_BUILDINGS[0];

  const [selectedDay, setSelectedDay] = useState('Monday');

  // Find all scheduled sessions in this room
  const roomSessions = SESSIONS.filter((s) => s.room === room.id);
  const daySessions = roomSessions.filter((s) => s.day === selectedDay);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const timeSlots = [
    '08:00 - 09:00',
    '09:00 - 10:00',
    '10:00 - 11:00',
    '11:00 - 12:00',
    '12:00 - 13:00',
    '13:00 - 14:00',
    '14:00 - 15:00',
    '15:00 - 16:00',
    '16:00 - 17:00',
    '17:00 - 18:00',
  ];

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
        <Link
          to={`/campus/${building.id}/floor/${room.floor}`}
          className="hover:text-[#B8F36B]"
        >
          Floor {room.floor}
        </Link>
        <span>/</span>
        <span className="text-slate-200 font-medium">{room.name}</span>
      </div>

      <PageHeader
        title={`${room.name} — ${room.type}`}
        subtitle={`${room.building} • Level ${room.floor}`}
        badge={<StatusBadge status={room.status} />}
      >
        <Button
          variant="primary"
          onClick={() => navigate(`/bookings/new?room=${room.id}`)}
          icon={PlusCircle}
        >
          Book Room
        </Button>
      </PageHeader>

      {/* Room Specifications Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <span className="text-xs text-slate-400 block">Total Capacity</span>
          <span className="text-xl font-bold text-slate-100 mt-1 block">
            {room.capacity} Seats
          </span>
          <span className="text-[11px] text-teal-400 mt-1 block">
            Exam Capacity: {Math.floor(room.capacity / 2)}
          </span>
        </Card>

        <Card className="p-4">
          <span className="text-xs text-slate-400 block">Room Category</span>
          <span className="text-xl font-bold text-slate-100 mt-1 block">
            {room.type}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Academic Schedule
          </span>
        </Card>

        <Card className="p-4">
          <span className="text-xs text-slate-400 block">Wheelchair Access</span>
          <span className="text-xl font-bold text-slate-100 mt-1 block">
            {room.accessible ? 'Accessible' : 'Stairs Only'}
          </span>
          <span className="text-[11px] text-emerald-400 mt-1 block">
            {room.accessible ? 'Ground / Elevator' : 'Upper Floor'}
          </span>
        </Card>

        <Card className="p-4">
          <span className="text-xs text-slate-400 block">Active Status</span>
          <span className="text-xl font-bold text-slate-100 mt-1 block capitalize">
            {room.status}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Live occupancy sensor
          </span>
        </Card>
      </div>

      {/* Facilities & Amenities */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-3">
          Installed Hardware & Facilities
        </h3>
        <div className="flex flex-wrap gap-2">
          {room.facilities.map((fac, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 text-xs font-medium text-slate-200"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
              <span>{fac}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Daily Room Timetable Schedule */}
      <Card className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-100">
              Timetable Schedule for {room.name}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Weekly class distribution synthesized by the solver
            </p>
          </div>

          {/* Day selection tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {days.map((day) => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedDay === day
                    ? 'bg-[#B8F36B] text-[#101110] font-bold shadow-glow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        {/* Sessions list for selected day */}
        <div className="space-y-3">
          {daySessions.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400 border border-dashed border-slate-800 rounded-xl">
              No academic classes scheduled in {room.name} on {selectedDay}. Room is free for venue booking!
            </div>
          ) : (
            daySessions.map((s) => {
              const course = COURSES.find((c) => c.id === s.course);
              const faculty = FACULTY.find((f) => f.id === s.faculty);

              return (
                <div
                  key={s.id}
                  className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[#B8F36B]/15 border border-[#B8F36B]/30 text-[#B8F36B] font-bold flex flex-col items-center justify-center text-xs">
                      <span>{s.startTime}</span>
                      <span className="text-[9px] text-slate-500">{s.endTime}</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-100 text-sm">
                          {s.course}: {course?.name || 'Class Session'}
                        </span>
                        <Badge variant="blue" size="sm">
                          {s.type}
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                        <span>Faculty: {faculty?.name || s.faculty}</span>
                        <span>•</span>
                        <span>Group: {s.group}</span>
                      </div>
                    </div>
                  </div>

                  <Badge variant="amber" size="sm">
                    In Session
                  </Badge>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}
