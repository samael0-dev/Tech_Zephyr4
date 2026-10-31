// src/features/assistant/AIAssistant.jsx
import React, { useState, useRef, useEffect } from 'react';
import { assistantService } from '@/services/assistantService';
import { AI_SUGGESTIONS, ROOMS } from '@/data/demoData';
import {
  Sparkles,
  Send,
  Bot,
  User,
  Clock,
  Building,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Badge, Button, Card, PageHeader, DemoBanner } from '@/components/common';
import { useToast } from '@/components/common/Toaster';
import { useNavigate } from 'react-router-dom';

export default function AIAssistant() {
  const navigate = useNavigate();
  const toast = useToast();
  const [messages, setMessages] = useState([
    {
      id: 'm1',
      sender: 'assistant',
      text: "Hello! I'm the CITRIX AI Campus Assistant. I can help explain timetable decisions, find clash-free classrooms, reschedule lectures, or formulate venue requests in plain English or Hinglish.",
      timestamp: 'Just now',
      suggestions: [
        'Why was CS201 scheduled at 8:00 AM on Monday?',
        'Find an accessible seminar hall for 80 attendees tomorrow.',
        'Reschedule my OS lecture from Monday to Wednesday.',
        'Why was the Robotics Club venue application rejected?',
      ],
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleConfirmProposal = async (msgId, intent, proposal) => {
    try {
      const res = await assistantService.confirmAction(intent, proposal, true);
      toast.success(res?.message || 'Action executed and verified!');
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId ? { ...m, actionConfirmed: true } : m
        )
      );
    } catch (err) {
      toast.error('Action confirmation failed: ' + (err.message || err));
    }
  };

  const handleSend = async (queryToSend) => {
    const query = queryToSend || inputQuery;
    if (!query.trim()) return;

    const userMsg = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setLoading(true);

    try {
      const resp = await assistantService.query(query);

      let responseText = resp.reply || resp.data?.response || resp.data?.reply;
      let actionRooms = resp.data?.rooms || [];

      // Check for specific explanations fallback if local
      if (resp.demo) {
        if (query.toLowerCase().includes('8:00') || query.toLowerCase().includes('8 am')) {
          responseText =
            '[DEMO] Decision Explanation for CS201 at 8:00 AM:\n\n1. **Faculty Availability Window**: Dr. Priya Sharma is booked for CS202 Lab from 14:00–17:00 and designated unavailable on Thursday afternoon.\n2. **Student Cohort Continuity**: CSE-A3 requires a contiguous 4-hour slot for Mathematics and Logic later in the day.\n3. **Hard Constraint Satisfaction**: 0 room overlaps occurred across Academic Block A.\n\nHence, 8:00 AM maximized cohort satisfaction without introducing cascading clashes.';
        } else if (query.toLowerCase().includes('rejected') || query.toLowerCase().includes('robotics')) {
          responseText =
            '[DEMO] Decision Explanation for Venue Rejection:\n\n• **Application**: Robotics Club Workshop in Seminar Hall 1 (SH-1)\n• **Constraint Violated**: Venue already locked for department midsem makeup exams.\n• **Priority Tier**: Section 4 places Academic Makeup Exams at Priority 1, whereas Technical Club workshops operate at Priority 3.\n• **Alternative Recommended**: Seminar Hall 2 (SH-2) has matching 150-seat capacity and is completely free during your requested window!';
        }
      }

      const botMsg = {
        id: `b-${Date.now()}`,
        sender: 'assistant',
        text: responseText || 'Request processed by CITRIX Assistant.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: resp.data?.suggestions,
        rooms: actionRooms,
        requiresConfirmation: resp.requiresConfirmation,
        actionProposal: resp.actionProposal,
        intent: resp.intent,
        actionConfirmed: false,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: 'Unable to communicate with the NLP solver adapter. Please verify connection.',
          timestamp: 'Now',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4">
      <PageHeader
        title="CITRIX Intelligent AI Assistant"
        subtitle="Conversational assistant for faculty &amp; clubs: Schedule change formulation, constraint explanations, and venue discovery"
        badge={<DemoBanner text="Explainable AI &amp; Solver Interpreter" />}
      />

      {/* Main Chat Box Card */}
      <Card className="flex-1 flex flex-col overflow-hidden border-slate-700/80 bg-slate-950/70 shadow-2xl">
        {/* Chat message history container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((m) => {
            const isUser = m.sender === 'user';

            return (
              <div
                key={m.id}
                className={`flex gap-3 max-w-3xl ${
                  isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    isUser
                      ? 'bg-blue-600 text-white'
                      : 'bg-gradient-to-tr from-teal-500 to-blue-600 text-white shadow-md'
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div className="space-y-2">
                  <div
                    className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-line ${
                      isUser
                        ? 'bg-blue-600 text-white rounded-tr-none'
                        : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none shadow-md'
                    }`}
                  >
                    {m.text}

                    {/* Interactive room badges if suggested */}
                    {m.rooms && m.rooms.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-800 flex flex-wrap gap-2">
                        {m.rooms.map((roomId) => (
                          <button
                            key={roomId}
                            onClick={() => navigate(`/bookings/new?room=${roomId}`)}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-teal-400 flex items-center gap-1.5 transition-colors"
                          >
                            <Building className="w-3.5 h-3.5" />
                            <span>Book {roomId}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Human-in-the-Loop Action Proposal Card */}
                    {m.requiresConfirmation && m.actionProposal && (
                      <div className="mt-3 p-3 bg-slate-950/80 border border-amber-500/40 rounded-xl space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                          <span>Action Requires Human Approval</span>
                        </div>
                        <div className="text-[11px] text-slate-300 font-mono bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                          {JSON.stringify(m.actionProposal, null, 2)}
                        </div>
                        {m.actionConfirmed ? (
                          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold pt-1">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Action Confirmed and Executed</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 pt-1">
                            <Button
                              variant="emerald"
                              size="sm"
                              icon={CheckCircle2}
                              onClick={() => handleConfirmProposal(m.id, m.intent, m.actionProposal)}
                            >
                              Confirm & Execute
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Suggestion Chips */}
                  {m.suggestions && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {m.suggestions.map((s, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSend(s)}
                          className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-blue-300 transition-colors"
                        >
                          "{s}"
                        </button>
                      ))}
                    </div>
                  )}

                  <span className="text-[10px] text-slate-500 block px-1">
                    {m.timestamp}
                  </span>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex items-center gap-3 text-slate-400 text-xs py-2">
              <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <span>Formulating solver explanation and verifying constraints...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Input Area */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center gap-3">
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            placeholder="Ask why a class was placed at 8 AM, request room availability, or reschedule a session..."
            className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
          <Button
            variant="primary"
            onClick={() => handleSend()}
            disabled={!inputQuery.trim() || loading}
            icon={Send}
          >
            Send
          </Button>
        </div>
      </Card>
    </div>
  );
}
