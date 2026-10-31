// src/components/common/Toaster.jsx
import { create } from 'zustand';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useEffect } from 'react';

const useToastStore = create((set) => ({
  toasts: [],
  add: (toast) =>
    set((s) => ({ toasts: [...s.toasts, { id: Date.now(), ...toast }] })),
  remove: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const useToast = () => {
  const add = useToastStore((s) => s.add);
  return {
    success: (msg) => add({ type: 'success', message: msg }),
    error: (msg) => add({ type: 'error', message: msg }),
    warning: (msg) => add({ type: 'warning', message: msg }),
    info: (msg) => add({ type: 'info', message: msg }),
  };
};

const ICONS = {
  success: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
  error: <XCircle className="w-4 h-4 text-rose-400 shrink-0" />,
  warning: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
  info: <Info className="w-4 h-4 text-indigo-400 shrink-0" />,
};

const BORDERS = {
  success: 'border-emerald-500/30 bg-emerald-950/20',
  error: 'border-rose-500/30 bg-rose-950/20',
  warning: 'border-amber-500/30 bg-amber-950/20',
  info: 'border-indigo-500/30 bg-indigo-950/20',
};

function Toast({ id, type, message }) {
  const remove = useToastStore((s) => s.remove);
  useEffect(() => {
    const t = setTimeout(() => remove(id), 4000);
    return () => clearTimeout(t);
  }, [id, remove]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 60, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.95 }}
      className={`flex items-center gap-3 px-4 py-3 bg-[#0B1120]/95 backdrop-blur-xl border ${BORDERS[type]} rounded-2xl shadow-2xl min-w-[300px] max-w-sm`}
    >
      {ICONS[type]}
      <span className="text-xs sm:text-sm font-medium text-slate-100 flex-1 leading-snug">
        {message}
      </span>
      <button
        onClick={() => remove(id)}
        className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800/60 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 pointer-events-auto">
      <AnimatePresence>
        {toasts.map((t) => (
          <Toast key={t.id} {...t} />
        ))}
      </AnimatePresence>
    </div>
  );
}
