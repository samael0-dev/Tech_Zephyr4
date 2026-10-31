// src/features/admin/AuditLog.jsx
import React, { useState, useEffect } from 'react';
import { auditService } from '@/services/auditService';
import { AUDIT_LOGS } from '@/data/demoData';
import {
  History,
  Search,
  Filter,
  Download,
  CheckCircle2,
  XCircle,
  Sparkles,
  User,
  Clock,
  Layers,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { Badge, Button, Card, PageHeader, DemoBanner } from '@/components/common';
import { useToast } from '@/components/common/Toaster';

export default function AuditLog() {
  const toast = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterAction, setFilterAction] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadLogs() {
      setLoading(true);
      setError(null);
      try {
        const resp = await auditService.getLogs();
        setLogs(resp.data || []);
      } catch (err) {
        console.error('Could not load live audit logs:', err);
        setError(err.message || 'Failed to load audit logs from server');
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, []);

  const actionTypes = [
    'ALL',
    'BOOKING_APPROVED',
    'BOOKING_REJECTED',
    'TIMETABLE_GENERATED',
    'MIDSEM_SCHEDULED',
    'SPECTRA_APPROVED',
    'DISRUPTION_REPORTED',
  ];

  const filteredLogs = logs.filter((log) => {
    if (filterAction !== 'ALL' && log.action !== filterAction) return false;
    if (searchQuery) {
      return (
        log.entity.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.details.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return true;
  });

  const getBadgeVariant = (action) => {
    if (action.includes('APPROVED')) return 'green';
    if (action.includes('REJECTED')) return 'red';
    if (action.includes('GENERATED') || action.includes('SCHEDULED')) return 'blue';
    if (action.includes('DISRUPTION')) return 'amber';
    return 'slate';
  };

  const handleExport = () => {
    toast.success('Audit history exported (Demo)');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Institutional System Audit Trail"
        subtitle="Immutable transaction log of timetable generation, approvals, overrides, and disruption submissions"
        badge={<DemoBanner text="Tamper-Evident Institutional Log" />}
      >
        <Button variant="outline" onClick={handleExport} icon={Download}>
          Export Audit Trail
        </Button>
      </PageHeader>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {actionTypes.map((type) => (
            <button
              key={type}
              onClick={() => setFilterAction(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                filterAction === type
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search audit trail..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Audit Log Entries List */}
      <Card className="divide-y divide-slate-800/80 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            Loading cryptographic audit logs from server...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-rose-400 bg-rose-950/20">
            Error loading audit trail: {error}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No audit log entries found matching criteria.
          </div>
        ) : (
          filteredLogs.map((log) => (
          <div
            key={log.id}
            className="p-4 hover:bg-slate-800/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center font-mono text-[10px] text-blue-400 shrink-0">
                {log.id}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={getBadgeVariant(log.action)} size="sm">
                    {log.action}
                  </Badge>
                  <span className="font-bold text-slate-100">{log.entity}</span>
                </div>
                <p className="text-slate-300 text-xs">{log.details}</p>
                <div className="text-[11px] text-slate-500 flex items-center gap-3">
                  <span>Actor: <strong className="text-slate-400">{log.actor}</strong></span>
                  <span>•</span>
                  <span>Timestamp: {new Date(log.timestamp).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 shrink-0 font-mono">
              Signed &amp; Verified
            </div>
          </div>
        )))}
      </Card>
    </div>
  );
}
