import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle, Info, X, XCircle } from "lucide-react";
import { create } from "zustand";

export type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastStore {
  toasts: Toast[];
  add: (toast: Omit<Toast, "id">) => void;
  remove: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  add: (toast) => {
    const id = Math.random().toString(36).slice(2);
    const duration = toast.duration ?? 4000;
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    if (duration > 0) {
      setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
      }, duration);
    }
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

// Convenience helpers
export const toast = {
  success: (title: string, message?: string) =>
    useToastStore.getState().add({ type: "success", title, message }),
  error: (title: string, message?: string) =>
    useToastStore.getState().add({ type: "error", title, message }),
  info: (title: string, message?: string) =>
    useToastStore.getState().add({ type: "info", title, message }),
  warning: (title: string, message?: string) =>
    useToastStore.getState().add({ type: "warning", title, message }),
};

const icons = {
  success: <CheckCircle size={16} className="text-green-400 shrink-0" />,
  error: <XCircle size={16} className="text-red-400 shrink-0" />,
  warning: <AlertCircle size={16} className="text-yellow-400 shrink-0" />,
  info: <Info size={16} className="text-brand-400 shrink-0" />,
};

const borderColors = {
  success: "border-green-500/30",
  error: "border-red-500/30",
  warning: "border-yellow-500/30",
  info: "border-brand-500/30",
};

function ToastItem({ toast: t }: { toast: Toast }) {
  const { remove } = useToastStore();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 60, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.95 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`glass-card border ${borderColors[t.type]} px-4 py-3 flex items-start gap-3 min-w-[280px] max-w-sm shadow-xl`}
    >
      {icons[t.type]}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">{t.title}</p>
        {t.message && <p className="text-xs text-dark-400 mt-0.5">{t.message}</p>}
      </div>
      <button
        onClick={() => remove(t.id)}
        className="text-dark-500 hover:text-white transition-colors shrink-0"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}

export function ToastContainer() {
  const { toasts } = useToastStore();

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
