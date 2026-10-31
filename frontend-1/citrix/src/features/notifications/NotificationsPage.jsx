// src/features/notifications/NotificationsPage.jsx
import React, { useState, useEffect } from 'react';
import { useNotificationStore } from '@/store/notificationStore';
import { useAuthStore } from '@/store/authStore';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  CheckCheck,
  Clock,
  Sparkles
} from 'lucide-react';
import { Badge, Button, Card, PageHeader, DemoBanner } from '@/components/common';
import { useToast } from '@/components/common/Toaster';

export default function NotificationsPage() {
  const toast = useToast();
  const { user } = useAuthStore();
  const { notifications, fetchNotifications, markRead, markAllRead } =
    useNotificationStore();

  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    fetchNotifications(user?.role);
  }, [user?.role, fetchNotifications]);

  const filtered = notifications.filter((n) => {
    if (activeFilter === 'unread') return !n.read;
    if (activeFilter === 'warning') return n.type === 'warning';
    if (activeFilter === 'success') return n.type === 'success';
    if (activeFilter === 'error') return n.type === 'error';
    return true;
  });

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-400" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  const handleMarkAll = () => {
    markAllRead();
    toast.success('All notifications marked as read');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Activity &amp; Institutional Notifications"
        subtitle="Live event alerts, approval updates, solver completion broadcasts, and schedule conflict warnings"
        badge={<DemoBanner text="Live Event Stream" />}
      >
        <Button variant="outline" onClick={handleMarkAll} icon={CheckCheck}>
          Mark All Read
        </Button>
      </PageHeader>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {['all', 'unread', 'success', 'warning', 'error'].map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
              activeFilter === f
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card className="p-12 text-center text-sm text-slate-500">
            No notifications in this filter category
          </Card>
        ) : (
          filtered.map((n) => (
            <Card
              key={n.id}
              onClick={() => markRead(n.id)}
              className={`p-4 flex items-start gap-4 cursor-pointer transition-all ${
                !n.read
                  ? 'bg-slate-900/90 border-blue-500/40 shadow-md'
                  : 'bg-slate-950/60 border-slate-800 opacity-80'
              }`}
            >
              <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/60 shrink-0">
                {getIcon(n.type)}
              </div>

              <div className="flex-1 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-100">
                      {n.title}
                    </span>
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(n.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <p className="text-slate-300 leading-relaxed">{n.message}</p>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
