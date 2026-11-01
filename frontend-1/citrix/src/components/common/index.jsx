// src/components/common/index.jsx
import React, { useEffect } from 'react';
import { cn } from '@/utils/cn';
import { X, Search, AlertCircle, Info, Sparkles, Building2, CheckCircle2, Clock } from 'lucide-react';

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  disabled,
  loading,
  icon: Icon,
  ...props
}) {
  const base = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#080A09] disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98] tracking-tight';

  const variants = {
    primary: 'bg-[#B8F36B] hover:bg-[#A6E854] text-[#101110] font-bold focus:ring-[#B8F36B] shadow-glow-sm hover:shadow-glow-green border border-[#B8F36B]/20',
    secondary: 'bg-[#161B18] hover:bg-[#1F2420] text-slate-200 border border-[#1F2420] focus:ring-[#B8F36B]',
    teal: 'bg-[#007A64] hover:bg-[#009477] text-white focus:ring-[#007A64] shadow-lg shadow-black/40 border border-[#007A64]/30',
    danger: 'bg-rose-600/90 hover:bg-rose-500 text-white focus:ring-rose-500 shadow-lg shadow-rose-950/40 border border-rose-500/30',
    ghost: 'bg-transparent hover:bg-[#161B18] text-[#9AA19C] hover:text-white',
    outline: 'border border-[#1F2420] hover:border-[#B8F36B]/40 text-[#9AA19C] hover:text-white hover:bg-[#161B18]/50',
    emerald: 'bg-[#10B981] hover:bg-[#059669] text-[#101110] font-bold focus:ring-[#10B981] shadow-lg shadow-emerald-950/40 border border-[#10B981]/30',
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-xs sm:text-sm px-4 py-2 gap-2',
    lg: 'text-sm sm:text-base px-5 py-2.5 gap-2.5',
  };

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin mr-1" />
      ) : Icon ? (
        <Icon className={cn('w-4 h-4', size === 'sm' ? 'w-3.5 h-3.5' : '')} />
      ) : null}
      {children}
    </button>
  );
}

export function Badge({
  children,
  variant = 'slate',
  size = 'md',
  className,
  dot = false,
}) {
  const variants = {
    blue: 'bg-[#B8F36B]/15 text-[#B8F36B] border-[#B8F36B]/30',
    teal: 'bg-[#007A64]/20 text-[#10B981] border-[#007A64]/40',
    green: 'bg-[#10B981]/15 text-[#B8F36B] border-[#10B981]/30',
    amber: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
    red: 'bg-rose-500/15 text-rose-300 border-rose-500/25',
    purple: 'bg-[#0B132B] text-[#B8F36B] border-[#1F2420]',
    slate: 'bg-[#161B18] text-[#9AA19C] border-[#1F2420]',
  };

  const sizes = {
    sm: 'text-[10px] px-2 py-0.5 tracking-wider',
    md: 'text-xs px-2.5 py-1 tracking-wider',
  };

  const dotColors = {
    blue: 'bg-[#B8F36B]',
    teal: 'bg-[#10B981]',
    green: 'bg-[#B8F36B]',
    amber: 'bg-amber-400',
    red: 'bg-rose-400',
    purple: 'bg-[#B8F36B]',
    slate: 'bg-[#777D78]',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-bold rounded-full border uppercase tracking-wider',
        variants[variant] || variants.slate,
        sizes[size],
        className
      )}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full animate-pulse', dotColors[variant] || 'bg-[#777D78]')} />}
      {children}
    </span>
  );
}

export function Card({ children, className, hover = false, ...props }) {
  return (
    <div
      className={cn(
        'bg-[#161B18] border border-[#1F2420] rounded-2xl backdrop-blur-md transition-all duration-200',
        hover && 'hover:bg-[#121614] hover:border-[#B8F36B]/40 hover:shadow-elevation hover:shadow-black/40',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="fixed inset-0" onClick={onClose} />
      <div
        className={cn(
          'relative w-full bg-[#080A09] border border-[#1F2420] rounded-2xl shadow-floating z-10 overflow-hidden flex flex-col max-h-[90vh]',
          sizeClasses[size]
        )}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1F2420] bg-[#121614]">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-[#9AA19C] hover:text-white hover:bg-[#161B18] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
}

export function Spinner({ size = 'md', className }) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };
  return (
    <div
      className={cn(
        'rounded-full border-slate-700 border-t-indigo-500 animate-spin',
        sizes[size],
        className
      )}
    />
  );
}

export function EmptyState({ icon: Icon = AlertCircle, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/20">
      <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-400 mb-4 shadow-inner">
        <Icon className="w-7 h-7 text-[#B8F36B]" />
      </div>
      <h4 className="text-base font-bold text-slate-100 mb-1">{title}</h4>
      <p className="text-xs sm:text-sm text-slate-400 max-w-sm mb-5 leading-relaxed">{description}</p>
      {action}
    </div>
  );
}

export function StatusBadge({ status }) {
  const map = {
    available: { variant: 'green', text: 'Available', dot: true },
    occupied: { variant: 'red', text: 'Occupied', dot: true },
    partial: { variant: 'amber', text: 'Partial', dot: true },
    pending: { variant: 'purple', text: 'Pending Approval', dot: true },
    approved: { variant: 'green', text: 'Approved', dot: true },
    rejected: { variant: 'red', text: 'Rejected', dot: true },
    conflict: { variant: 'red', text: 'Conflict Detected', dot: true },
    scheduled: { variant: 'blue', text: 'Scheduled', dot: true },
    unscheduled: { variant: 'slate', text: 'Unscheduled', dot: false },
  };

  const config = map[status] || { variant: 'slate', text: status, dot: false };
  return (
    <Badge variant={config.variant} dot={config.dot} size="sm">
      {config.text}
    </Badge>
  );
}

export function DemoBanner({ text = 'Demo Mode — Visual Demonstration' }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/25 rounded-lg text-amber-300 text-[11px] font-semibold shadow-sm tracking-wide">
      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
      <span>{text}</span>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  children,
  badge,
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80 mb-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-3 flex-wrap">{children}</div>}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Search...', className }) {
  return (
    <div className={cn('relative w-full max-w-xs', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
      />
    </div>
  );
}
