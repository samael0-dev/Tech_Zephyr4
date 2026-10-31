// src/features/rooms/RoomSearch.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { roomService } from '@/services/roomService';
import { ROOMS } from '@/data/demoData';
import { CAMPUS_BUILDINGS } from '@/data/campusLayout';
import {
  Building2,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Users,
  LayoutGrid,
  List,
  Sparkles,
  ArrowRight,
  Boxes,
  Loader2,
} from 'lucide-react';
import { Badge, Button, Card, PageHeader, StatusBadge, DemoBanner } from '@/components/common';

export default function RoomSearch() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [minCapacity, setMinCapacity] = useState(0);
  const [accessibleOnly, setAccessibleOnly] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  useEffect(() => {
    async function loadRooms() {
      setLoading(true);
      setError(null);
      try {
        const resp = await roomService.getRooms();
        setRooms(resp.data || []);
      } catch (err) {
        console.error('Could not load live rooms:', err);
        setError(err.message || 'Failed to load rooms from server');
      } finally {
        setLoading(false);
      }
    }
    loadRooms();
  }, []);

  const buildings = ['All', ...new Set(rooms.map((r) => r.building))];
  const types = ['All', ...new Set(rooms.map((r) => r.type))];

  const filteredRooms = rooms.filter((r) => {
    if (selectedBuilding !== 'All' && r.building !== selectedBuilding) return false;
    if (selectedType !== 'All' && r.type !== selectedType) return false;
    if (selectedStatus !== 'All' && r.status !== selectedStatus) return false;
    if (r.capacity < minCapacity) return false;
    if (accessibleOnly && !r.accessible) return false;
    if (searchQuery) {
      return (
        (r.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.building || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.facilities || []).some((f) => f.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campus Venue Directory &amp; Availability"
        subtitle="Search, filter, and inspect real-time availability across all 27 classrooms, seminar halls, and laboratories"
        badge={<DemoBanner text="Live Occupancy &amp; Suitability Engine" />}
      >
        <Button
          variant="primary"
          onClick={() => navigate('/campus')}
          icon={Boxes}
        >
          View in 3D Campus
        </Button>
      </PageHeader>

      {/* Filter Toolbar Card */}
      <Card className="p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Search Input */}
          <div className="space-y-1 sm:col-span-2">
            <label className="font-semibold text-slate-300">Search Venue / Facility</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g. A-101, Projector, Computer Lab..."
                className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Building Filter */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-300">Building Block</label>
            <select
              value={selectedBuilding}
              onChange={(e) => setSelectedBuilding(e.target.value)}
              className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none"
            >
              {buildings.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Room Type Filter */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-300">Venue Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none"
            >
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-300">Availability</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="available">Available Now</option>
              <option value="occupied">Occupied</option>
              <option value="partial">Partially Free</option>
            </select>
          </div>
        </div>

        {/* Secondary filters row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-3 border-t border-slate-800 text-xs gap-3">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={accessibleOnly}
                onChange={(e) => setAccessibleOnly(e.target.checked)}
                className="rounded text-blue-600 focus:ring-0"
              />
              <span>♿ Wheelchair Accessible Only</span>
            </label>

            <div className="flex items-center gap-2">
              <span className="text-slate-400">Min Capacity:</span>
              <input
                type="range"
                min="0"
                max="600"
                step="20"
                value={minCapacity}
                onChange={(e) => setMinCapacity(Number(e.target.value))}
                className="w-24 accent-blue-500 cursor-pointer"
              />
              <span className="font-mono text-teal-400 font-bold">
                {minCapacity}+ seats
              </span>
            </div>
          </div>

          {/* Grid / List switch */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded text-xs ${
                viewMode === 'grid'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded text-xs ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Card>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>Showing <strong>{filteredRooms.length}</strong> matching campus venues</span>
        <span>Click any venue for complete timetable and instant booking</span>
      </div>

      {/* Grid View */}
      {loading ? (
        <Card className="p-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
          Loading campus venues from authoritative server...
        </Card>
      ) : error ? (
        <Card className="p-8 text-center text-xs text-rose-400 bg-rose-950/20">
          Error loading rooms: {error}
        </Card>
      ) : filteredRooms.length === 0 ? (
        <Card className="p-12 text-center text-xs text-slate-500">
          No campus rooms found matching the selected criteria.
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRooms.map((room) => {
            const bld = CAMPUS_BUILDINGS.find((b) => b.name === room.building);
            const bldId = bld?.id || 'academic-a';

            return (
              <Card
                key={room.id}
                className="p-5 flex flex-col justify-between space-y-4 hover:border-slate-600 transition-all group"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-base text-slate-100 group-hover:text-blue-400 transition-colors">
                        {room.name}
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {room.building} • Floor {room.floor}
                      </p>
                    </div>
                    <StatusBadge status={room.status} />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-slate-900 rounded-lg">
                      <span className="text-slate-500 block text-[10px] uppercase">Capacity</span>
                      <span className="font-bold text-slate-200">{room.capacity} Seats</span>
                    </div>
                    <div className="p-2 bg-slate-900 rounded-lg">
                      <span className="text-slate-500 block text-[10px] uppercase">Category</span>
                      <span className="font-bold text-slate-200 truncate block">{room.type}</span>
                    </div>
                  </div>

                  {/* Facilities list */}
                  <div className="mt-3 flex flex-wrap gap-1">
                    {room.facilities.slice(0, 3).map((f, i) => (
                      <span
                        key={i}
                        className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800"
                      >
                        {f}
                      </span>
                    ))}
                    {room.facilities.length > 3 && (
                      <span className="text-[10px] px-1 text-slate-500">
                        +{room.facilities.length - 3}
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <button
                    onClick={() =>
                      navigate(`/campus/${bldId}/floor/${room.floor}/room/${room.id}`)
                    }
                    className="font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    <span>Timeline Details</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs py-1 h-auto"
                    onClick={() => navigate(`/bookings/new?room=${room.id}`)}
                  >
                    Book Room
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* List View */
        <Card className="overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Room Name</th>
                <th className="py-3 px-4">Building</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Capacity</th>
                <th className="py-3 px-4">Accessibility</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredRooms.map((room) => {
                const bld = CAMPUS_BUILDINGS.find((b) => b.name === room.building);
                const bldId = bld?.id || 'academic-a';

                return (
                  <tr key={room.id} className="hover:bg-slate-800/50">
                    <td className="py-3 px-4 font-bold text-slate-200">{room.name}</td>
                    <td className="py-3 px-4 text-slate-400">{room.building}</td>
                    <td className="py-3 px-4 text-slate-300">{room.type}</td>
                    <td className="py-3 px-4 text-slate-300 font-mono">{room.capacity} seats</td>
                    <td className="py-3 px-4 text-slate-400">
                      {room.accessible ? '♿ Accessible' : 'Standard'}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={room.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[11px] py-1 h-auto"
                        onClick={() =>
                          navigate(`/campus/${bldId}/floor/${room.floor}/room/${room.id}`)
                        }
                      >
                        Inspect
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
