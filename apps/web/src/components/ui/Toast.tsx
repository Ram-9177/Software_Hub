import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CircleCheck, CircleX, Info, TriangleAlert, X, type LucideIcon } from 'lucide-react';
import { cn } from './utils';

export type ToastTone = 'info' | 'success' | 'error' | 'warning';
export type ToastType = 'info' | 'success' | 'error' | 'warning';

export interface ToastOptions {
  title: string;
  description?: string;
  message?: string;
  tone?: ToastTone;
  type?: ToastType;
  duration?: number;
  durationMs?: number;
}

export interface ToastItem {
  id: string | number;
  title: string;
  description?: string;
  tone: ToastTone;
  duration: number;
}

export interface ToastApi {
  toast: (options: ToastOptions) => number | string;
  showToast: (options: ToastOptions) => number | string;
  dismiss: (id: string | number) => void;
  removeToast: (id: string | number) => void;
}

const DEFAULT_DURATION: Record<ToastTone, number> = {
  info: 5000,
  success: 5000,
  warning: 6000,
  error: 8000,
};

const TONES: Record<ToastTone, { icon: LucideIcon; iconClass: string; bar: string }> = {
  info: { icon: Info, iconClass: 'text-navy-600', bar: 'bg-navy-600' },
  success: { icon: CircleCheck, iconClass: 'text-accent-700', bar: 'bg-accent-600' },
  warning: { icon: TriangleAlert, iconClass: 'text-gold-800', bar: 'bg-gold-400' },
  error: { icon: CircleX, iconClass: 'text-danger-600', bar: 'bg-danger-600' },
};

const ToastContext = createContext<ToastApi | null>(null);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: string | number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (options: ToastOptions) => {
      const id = nextId.current++;
      const tone: ToastTone = options.tone || options.type || 'info';
      const item: ToastItem = {
        id,
        title: options.title,
        description: options.description || options.message,
        tone,
        duration: options.duration || options.durationMs || DEFAULT_DURATION[tone],
      };
      setToasts((list) => [...list, item].slice(-4));
      return id;
    },
    []
  );

  const api: ToastApi = useMemo(
    () => ({
      toast,
      showToast: toast,
      dismiss,
      removeToast: dismiss,
    }),
    [toast, dismiss]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
};

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      toast: () => 0,
      showToast: () => 0,
      dismiss: () => undefined,
      removeToast: () => undefined,
    };
  }
  return ctx;
}

function Toaster({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string | number) => void }) {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div
      aria-live="polite"
      aria-relevant="additions"
      aria-label="Notifications"
      role="region"
      className={cn(
        'pointer-events-none fixed inset-x-0 top-0 z-60 flex flex-col items-center gap-2 px-4 pt-[max(1rem,env(safe-area-inset-top))]',
        'sm:top-auto sm:right-4 sm:bottom-4 sm:left-auto sm:items-end sm:px-0 sm:pt-0'
      )}
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>,
    document.body
  );
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string | number) => void }) {
  const [paused, setPaused] = useState(false);
  const remaining = useRef(toast.duration);
  const tone = TONES[toast.tone] || TONES.info;
  const Icon = tone.icon;

  useEffect(() => {
    if (paused || toast.duration <= 0) return;
    const startedAt = Date.now();
    const timer = setTimeout(() => onDismiss(toast.id), remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt));
    };
  }, [paused, toast.duration, toast.id, onDismiss]);

  return (
    <div
      className="pointer-events-auto relative flex w-full max-w-sm animate-toast-in items-start gap-3 overflow-hidden rounded-card border border-line bg-surface py-3 pr-2 pl-4 shadow-pop"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <span aria-hidden className={cn('absolute inset-y-0 left-0 w-1', tone.bar)} />
      <Icon aria-hidden className={cn('mt-0.5 size-5 shrink-0', tone.iconClass)} />
      <div className="min-w-0 flex-1 py-0.5">
        <p className="text-sm font-semibold text-ink leading-tight">{toast.title}</p>
        {toast.description && <p className="mt-0.5 text-xs text-ink-soft leading-normal">{toast.description}</p>}
      </div>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={() => onDismiss(toast.id)}
        className="-my-1 inline-flex size-8 shrink-0 items-center justify-center rounded-control text-ink-faint hover:bg-canvas hover:text-ink focus-visible:outline-2 focus-visible:outline-navy-500 cursor-pointer"
      >
        <X aria-hidden className="size-4" />
      </button>
    </div>
  );
}

export default ToastProvider;
