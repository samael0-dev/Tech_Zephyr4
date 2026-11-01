// src/features/bookings/NLBookingComposer.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { bookingService } from '@/services/bookingService';
import { useBookingStore } from '@/store/bookingStore';
import { useAuthStore } from '@/store/authStore';
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
  Check,
  Send,
  Bot,
  User as UserIcon,
  HelpCircle,
  AlertCircle,
  RotateCcw
} from 'lucide-react';
import { Badge, Button, Card, PageHeader, DemoBanner } from '@/components/common';
import { useToast } from '@/components/common/Toaster';

export default function NLBookingComposer() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuthStore();
  const { submitBooking } = useBookingStore();
  const chatEndRef = useRef(null);

  const [messages, setMessages] = useState([
    {
      id: 'msg-0',
      sender: 'assistant',
      text: '👋 Namaste! I am CITRIX AI Booking Assistant. Express your venue request in English or Hinglish (e.g. "Kal 3 se 5 robotics workshop ke liye 60 logon ka accessible room chahiye"). If anything is missing, I will ask you right here in chat!',
      timestamp: 'Just now',
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [confidence, setConfidence] = useState(94);
  const [suggestedRooms, setSuggestedRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const samplePrompts = [
    'Kal 3 se 5 robotics workshop ke liye 60 logon ka accessible room chahiye.',
    'kal phy class',
    'Need a 100-seat auditorium for Friday evening cultural dance rehearsal.',
    'Computer lab for 35 students tomorrow morning 10 AM to 1 PM for Python test.',
  ];

  // Auto scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, analyzing]);

  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || inputText).trim();
    if (!query) return;

    const userMsg = {
      id: `msg-${Date.now()}-user`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setAnalyzing(true);

    try {
      const resp = await bookingService.parseNLRequest(query, parsedData);
      const data = resp.data || resp;
      const parsed = data.parsed || data;

      setParsedData(parsed);
      if (data.confidence) {
        setConfidence(Math.round(data.confidence * 100));
      }
      setSuggestedRooms(data.suggestedRooms || []);
      if (data.suggestedRooms?.length > 0 && !selectedRoomId) {
        setSelectedRoomId(data.suggestedRooms[0].id);
      }

      // Generate or retrieve assistant reply
      const replyText =
        data.reply ||
        `Maine aapka request note kar liya hai: **${parsed.title}** on **${parsed.date}** (${parsed.startTime} - ${parsed.endTime}) for **${parsed.capacity} attendees**. Neeche parameters verify karein aur right column se room choose karein.`;

      const aiMsg = {
        id: `msg-${Date.now()}-ai`,
        sender: 'assistant',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);

      if (data.is_complete) {
        toast.success('All parameters gathered! Select a room and submit.');
      } else {
        toast.info('Additional details needed — please reply in the chat.');
      }
    } catch (err) {
      console.error('Chat parse error:', err);
      const errorMsg = {
        id: `msg-${Date.now()}-err`,
        sender: 'assistant',
        text: 'Maaf kijiye, request samajhne me thodi dikkat hui. Kripya dobara likhein ya neeche form me direct parameters fill karein.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
      toast.error('Failed to parse request');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: 'msg-0',
        sender: 'assistant',
        text: '👋 Namaste! I am CITRIX AI Booking Assistant. Express your venue request in English or Hinglish. How can I help you today?',
        timestamp: 'Just now',
      },
    ]);
    setParsedData(null);
    setSuggestedRooms([]);
    setSelectedRoomId('');
    setInputText('');
  };

  const handleSubmitBooking = async () => {
    if (!selectedRoomId || !parsedData) return;
    setSubmitting(true);

    const isAdmin = user?.role === 'admin';

    try {
      const result = await submitBooking({
        title: parsedData.title,
        room: selectedRoomId,
        date: parsedData.date,
        startTime: parsedData.startTime,
        endTime: parsedData.endTime,
        attendees: parsedData.capacity,
        purpose: parsedData.purpose,
        requestedBy: user?.role || 'club-rep',
        type: 'nl',
        nlText: parsedData.rawText || messages[messages.length - 1]?.text,
        auto_execute: isAdmin,
      });

      const bookingStatus = result?.data?.status;

      if (isAdmin) {
        if (bookingStatus === 'rejected') {
          toast.error(`Booking Rejected: ${result?.data?.decision_reason || 'Conflict detected on this venue slot.'}`);
        } else {
          toast.success('Clash-Free! Venue booking directly executed & scheduled by Dean.');
        }
      } else {
        toast.success('Booking proposal successfully submitted to Dean’s approval queue!');
      }

      navigate('/bookings');
    } catch (err) {
      toast.error('Submission failed: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Smart AI Venue Request Composer"
        subtitle="Conversational booking assistant supporting plain English & Hinglish. Interactively resolves missing constraints and validates room eligibility."
        badge={<DemoBanner text="Active NLP Service • Groq AI Active" />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Interactive Chat & Parsed Structure */}
        <div className="space-y-4">
          <Card className="p-4 space-y-3 flex flex-col h-[460px] border-slate-800 bg-slate-950/60">
            {/* Chat Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-slate-200 tracking-wide">
                  Interactive Request Chat (English / Hinglish)
                </span>
              </div>
              <button
                onClick={handleResetChat}
                title="Restart conversation"
                className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            </div>

            {/* Scrollable Message Thread */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
              {messages.map((m) => {
                const isAI = m.sender === 'assistant';
                return (
                  <div
                    key={m.id}
                    className={`flex gap-2.5 ${isAI ? 'justify-start' : 'justify-end'}`}
                  >
                    {isAI && (
                      <div className="w-6 h-6 rounded-full bg-blue-600/30 border border-blue-500/40 flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="w-3.5 h-3.5 text-blue-400" />
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] rounded-2xl p-3 leading-relaxed whitespace-pre-wrap ${
                        isAI
                          ? 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-sm'
                          : 'bg-blue-600 text-white rounded-tr-sm shadow-md shadow-blue-600/20'
                      }`}
                    >
                      <p>{m.text}</p>
                      <span className={`block text-[10px] mt-1.5 text-right ${isAI ? 'text-slate-500' : 'text-blue-200'}`}>
                        {m.timestamp}
                      </span>
                    </div>

                    {!isAI && (
                      <div className="w-6 h-6 rounded-full bg-indigo-600/40 border border-indigo-500/40 flex items-center justify-center shrink-0 mt-0.5">
                        <UserIcon className="w-3.5 h-3.5 text-indigo-300" />
                      </div>
                    )}
                  </div>
                );
              })}

              {analyzing && (
                <div className="flex items-center gap-2 text-slate-400 text-xs py-1">
                  <div className="w-6 h-6 rounded-full bg-blue-600/30 border border-blue-500/40 flex items-center justify-center shrink-0">
                    <Bot className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                  </div>
                  <span className="animate-pulse">Analyzing query and verifying parameters...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick Sample Prompts Carousel / Chips */}
            <div className="border-t border-slate-800/80 pt-2 space-y-1">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                Quick Sample Prompts (Click to Send):
              </span>
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {samplePrompts.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(p)}
                    className="whitespace-nowrap text-[11px] text-slate-300 hover:text-blue-300 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 hover:border-blue-500/50 transition-colors"
                  >
                    "{p.length > 32 ? p.slice(0, 32) + '...' : p}"
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Input Bar */}
            <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={analyzing}
                placeholder="Type here in English or Hinglish (e.g. kal phy class, 10 to 12, 40 log)..."
                className="flex-1 p-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder-slate-500"
              />
              <Button
                variant="primary"
                onClick={() => handleSendMessage()}
                loading={analyzing}
                disabled={!inputText.trim()}
                icon={Send}
                size="sm"
              >
                Send
              </Button>
            </div>
          </Card>

          {/* Parsed Structure Preview & Inline Editing */}
          {parsedData && (
            <Card className="p-5 space-y-4 border-teal-500/30 animate-fade-in bg-slate-900/60">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-teal-400" />
                  Parsed Structured Parameters (Editable)
                </h3>
                <Badge variant="teal" size="sm">
                  {confidence}% Confidence
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="text-slate-400">Event Title</label>
                  <input
                    type="text"
                    value={parsedData.title || ''}
                    onChange={(e) =>
                      setParsedData({ ...parsedData, title: e.target.value })
                    }
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400">Date (YYYY-MM-DD)</label>
                  <input
                    type="date"
                    value={parsedData.date || '2026-11-09'}
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
                    value={parsedData.startTime || '09:00'}
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
                    value={parsedData.endTime || '10:00'}
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
                    value={parsedData.capacity || 40}
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
                    value={parsedData.type || 'Classroom'}
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
                  checked={Boolean(parsedData.accessible)}
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

        {/* Right Column: Suggested Rooms & Direct Execution / Submission */}
        <div className="space-y-4">
          <Card className="p-5 space-y-4">
            <h3 className="font-bold text-sm text-slate-100 flex items-center justify-between border-b border-slate-800 pb-3">
              <span>Suggested Matching Campus Venues</span>
              <span className="text-xs text-slate-400 font-normal">
                {suggestedRooms.length} Matched
              </span>
            </h3>

            {!parsedData ? (
              <div className="py-20 text-center text-xs text-slate-500 space-y-2">
                <Sparkles className="w-8 h-8 text-blue-400/40 mx-auto" />
                <p>Type your request in the chat on the left to scan available campus rooms</p>
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
                            Venue ID: {room.id}
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

                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <Button
                    variant={isAdmin ? 'emerald' : 'primary'}
                    className="w-full py-3 text-sm font-semibold shadow-lg shadow-emerald-500/10"
                    disabled={!selectedRoomId}
                    loading={submitting}
                    onClick={handleSubmitBooking}
                    icon={CheckCircle2}
                  >
                    {isAdmin
                      ? '⚡ Directly Approve & Schedule Venue (Executive)'
                      : 'Submit Booking Request to Dean'}
                  </Button>

                  {isAdmin && (
                    <p className="text-[11px] text-emerald-400/80 text-center">
                      ✓ Executive Authority: Automatically verified clash-free and directly added to the campus timetable without pending queues.
                    </p>
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
