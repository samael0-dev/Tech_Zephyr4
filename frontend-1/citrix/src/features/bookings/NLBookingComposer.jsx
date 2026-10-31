// src/features/bookings/NLBookingComposer.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { bookingService } from '@/services/bookingService';
import { useBookingStore } from '@/store/bookingStore';
import { useAuthStore } from '@/store/authStore';
import { ROOMS } from '@/data/demoData';
import {
  Sparkles,
  Search,
  CheckCircle2,
  Calendar,
  Clock,
  Building,
  Users,
  Edit3,
  ArrowRight,
  Info,
  Check
} from 'lucide-react';
import { Badge, Button, Card, PageHeader, DemoBanner } from '@/components/common';
import { useToast } from '@/components/common/Toaster';

export default function NLBookingComposer() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuthStore();
  const { submitBooking } = useBookingStore();

  const [promptText, setPromptText] = useState(
    'Kal 3 se 5 robotics workshop ke liye 60 logon ka accessible room chahiye.'
  );
  const [analyzing, setAnalyzing] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [suggestedRooms, setSuggestedRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const samplePrompts = [
    'Kal 3 se 5 robotics workshop ke liye 60 logon ka accessible room chahiye.',
    'Need a 100-seat auditorium for Friday evening cultural dance rehearsal.',
    'Computer lab for 35 students tomorrow morning 10 AM to 1 PM for Python test.',
    'Seminar hall with projector and AC for 80 attendees on Thursday 2 PM.',
  ];

  const handleAnalyse = async () => {
    if (!promptText.trim()) return;
    setAnalyzing(true);
    setParsedData(null);
    setSelectedRoomId('');

    try {
      const resp = await bookingService.parseNLRequest(promptText);
      setParsedData(resp.data.parsed);
      setSuggestedRooms(resp.data.suggestedRooms || []);
      if (resp.data.suggestedRooms?.length > 0) {
        setSelectedRoomId(resp.data.suggestedRooms[0].id);
      }
      toast.success('Prompt analyzed! Review parsed constraints before submission.');
    } catch (err) {
      toast.error('Failed to parse natural language request');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmitBooking = async () => {
    if (!selectedRoomId || !parsedData) return;
    setSubmitting(true);

    try {
      await submitBooking({
        title: parsedData.title,
        room: selectedRoomId,
        date: parsedData.date,
        startTime: parsedData.startTime,
        endTime: parsedData.endTime,
        attendees: parsedData.capacity,
        purpose: parsedData.purpose,
        requestedBy: user?.role || 'club-rep',
        type: 'nl',
        nlText: promptText,
      });

      toast.success('Booking proposal successfully submitted to Dean’s approval queue!');
      navigate('/bookings');
    } catch (err) {
      toast.error('Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Smart AI Venue Request Composer"
        subtitle="Submit venue applications written in plain English or Hinglish. Automatically extracts date, capacity, and accessibility requirements."
        badge={<DemoBanner text="NLP Service Interface • Mock Adapter v2.1" />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Natural Language Input & Sample Chips */}
        <div className="space-y-4">
          <Card className="p-5 space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider block mb-2">
                Express Request in English or Hinglish
              </label>
              <textarea
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                rows={4}
                className="w-full p-3.5 bg-slate-900 border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 leading-relaxed placeholder-slate-500"
                placeholder="e.g. Kal 2 baje se 4 baje tak seminar hall chahiye with projector..."
              />
            </div>

            {/* Quick Sample Prompts */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-slate-500 font-medium">
                Try Sample Prompts:
              </span>
              <div className="flex flex-col gap-1.5">
                {samplePrompts.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPromptText(p)}
                    className="text-left text-xs text-slate-400 hover:text-blue-300 p-2 rounded-lg bg-slate-900/60 hover:bg-slate-800 border border-slate-800/80 transition-colors"
                  >
                    "{p}"
                  </button>
                ))}
              </div>
            </div>

            <Button
              variant="primary"
              className="w-full"
              onClick={handleAnalyse}
              loading={analyzing}
              icon={Sparkles}
            >
              {analyzing ? 'Extracting Constraints...' : 'Analyse & Parse Request'}
            </Button>
          </Card>

          {/* Parsed Structure Preview & Inline Editing */}
          {parsedData && (
            <Card className="p-5 space-y-4 border-teal-500/30 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-teal-400" />
                  Parsed Structured Parameters (Editable)
                </h3>
                <Badge variant="teal" size="sm">
                  82% Confidence
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="text-slate-400">Event Title</label>
                  <input
                    type="text"
                    value={parsedData.title}
                    onChange={(e) =>
                      setParsedData({ ...parsedData, title: e.target.value })
                    }
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400">Date</label>
                  <input
                    type="date"
                    value={parsedData.date}
                    onChange={(e) =>
                      setParsedData({ ...parsedData, date: e.target.value })
                    }
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400">Start Time</label>
                  <input
                    type="time"
                    value={parsedData.startTime}
                    onChange={(e) =>
                      setParsedData({ ...parsedData, startTime: e.target.value })
                    }
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400">End Time</label>
                  <input
                    type="time"
                    value={parsedData.endTime}
                    onChange={(e) =>
                      setParsedData({ ...parsedData, endTime: e.target.value })
                    }
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400">Estimated Attendees</label>
                  <input
                    type="number"
                    value={parsedData.capacity}
                    onChange={(e) =>
                      setParsedData({
                        ...parsedData,
                        capacity: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400">Room Type</label>
                  <select
                    value={parsedData.type}
                    onChange={(e) =>
                      setParsedData({ ...parsedData, type: e.target.value })
                    }
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200"
                  >
                    <option value="Classroom">Classroom</option>
                    <option value="Computer Lab">Computer Lab</option>
                    <option value="Seminar Hall">Seminar Hall</option>
                    <option value="Auditorium">Auditorium</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                <input
                  type="checkbox"
                  id="accCheck"
                  checked={parsedData.accessible}
                  onChange={(e) =>
                    setParsedData({ ...parsedData, accessible: e.target.checked })
                  }
                  className="rounded text-blue-600 focus:ring-0"
                />
                <label htmlFor="accCheck" className="text-xs text-slate-300">
                  Wheelchair Accessible Venue Required (Ground Floor / Elevator)
                </label>
              </div>
            </Card>
          )}
        </div>

        {/* Right Column: Suggested Rooms & Submission */}
        <div className="space-y-4">
          <Card className="p-5 space-y-4">
            <h3 className="font-bold text-sm text-slate-100 flex items-center justify-between border-b border-slate-800 pb-3">
              <span>Suggested Matching Campus Venues</span>
              <span className="text-xs text-slate-400 font-normal">
                {suggestedRooms.length} Matched
              </span>
            </h3>

            {!parsedData ? (
              <div className="py-16 text-center text-xs text-slate-500 space-y-2">
                <Sparkles className="w-8 h-8 text-blue-400/40 mx-auto" />
                <p>Click "Analyse &amp; Parse Request" to scan available campus rooms</p>
              </div>
            ) : (
              <div className="space-y-3">
                {suggestedRooms.map((room) => {
                  const isSelected = selectedRoomId === room.id;

                  return (
                    <div
                      key={room.id}
                      onClick={() => setSelectedRoomId(room.id)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 space-y-2 text-xs ${
                        isSelected
                          ? 'bg-blue-950/40 border-blue-500 shadow-md shadow-blue-500/10'
                          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-sm text-slate-100 flex items-center gap-2">
                            <span>{room.name}</span>
                            <span className="text-xs font-normal text-slate-400">
                              ({room.type})
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {room.building} • Floor {room.floor}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-200">
                            {room.capacity} Seats
                          </span>
                          {isSelected && (
                            <span className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                        <span>{room.accessible ? '♿ Accessible' : 'Standard'}</span>
                        <span className="text-emerald-400 font-semibold">
                          Free at {parsedData.startTime} - {parsedData.endTime}
                        </span>
                      </div>
                    </div>
                  );
                })}

                <div className="pt-3 border-t border-slate-800">
                  <Button
                    variant="emerald"
                    className="w-full"
                    disabled={!selectedRoomId}
                    loading={submitting}
                    onClick={handleSubmitBooking}
                    icon={CheckCircle2}
                  >
                    Submit Booking Request to Dean
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
