import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { Icon } from './Icon';

// ---------------------------------------------------------------------------
// Global toast queue
// ---------------------------------------------------------------------------
//
// A single zustand store powers the toast queue across the whole app. The
// `useToast()` hook returns stable show/dismiss helpers; mount `<ToastHost />`
// once near the root and every screen can call `useToast().show('Saved')`.
//
// Previous patterns (router-state, in-component `flashToast`, ad-hoc
// `useState`) are superseded by this hook. New screens should always use
// `useToast()` instead of rolling their own.

export type ToastTone = 'info' | 'success' | 'warning' | 'error';

export interface ToastEntry {
  id: number;
  message: string;
  tone: ToastTone;
  durationMs: number;
}

interface ToastStore {
  toasts: ToastEntry[];
  push: (message: string, opts?: { tone?: ToastTone; durationMs?: number }) => number;
  dismiss: (id: number) => void;
  clear: () => void;
}

let _seq = 0;
const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (message, opts) => {
    const id = ++_seq;
    const entry: ToastEntry = {
      id,
      message,
      tone: opts?.tone ?? 'info',
      durationMs: opts?.durationMs ?? 2400,
    };
    set((s) => ({ toasts: [...s.toasts, entry] }));
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  clear: () => set({ toasts: [] }),
}));

export interface UseToast {
  show: (message: string, opts?: { tone?: ToastTone; durationMs?: number }) => number;
  success: (message: string, durationMs?: number) => number;
  error: (message: string, durationMs?: number) => number;
  warning: (message: string, durationMs?: number) => number;
  info: (message: string, durationMs?: number) => number;
  dismiss: (id: number) => void;
}

export function useToast(): UseToast {
  const push = useToastStore((s) => s.push);
  const dismiss = useToastStore((s) => s.dismiss);
  return {
    show: (message, opts) => push(message, opts),
    success: (message, durationMs) => push(message, { tone: 'success', durationMs }),
    error: (message, durationMs) => push(message, { tone: 'error', durationMs }),
    warning: (message, durationMs) => push(message, { tone: 'warning', durationMs }),
    info: (message, durationMs) => push(message, { tone: 'info', durationMs }),
    dismiss,
  };
}

// ---------------------------------------------------------------------------
// Visual host — mount once at the root.
// ---------------------------------------------------------------------------

function toneStyle(tone: ToastTone): { bg: string; color: string; icon: string } {
  switch (tone) {
    case 'success':
      return { bg: 'rgb(var(--success))', color: '#fff', icon: 'check_circle' };
    case 'error':
      return { bg: 'rgb(var(--error))', color: '#fff', icon: 'error' };
    case 'warning':
      return { bg: 'rgb(var(--warning))', color: '#fff', icon: 'warning' };
    case 'info':
    default:
      return { bg: 'rgb(var(--on-bg))', color: 'rgb(var(--bg))', icon: 'info' };
  }
}

function ToastItem({ toast }: { toast: ToastEntry }) {
  const dismiss = useToastStore((s) => s.dismiss);
  const [leaving, setLeaving] = useState(false);
  const meta = toneStyle(toast.tone);
  useEffect(() => {
    const t1 = window.setTimeout(() => setLeaving(true), toast.durationMs - 220);
    const t2 = window.setTimeout(() => dismiss(toast.id), toast.durationMs);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [toast.id, toast.durationMs, dismiss]);
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        borderRadius: 12,
        background: meta.bg,
        color: meta.color,
        boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
        minHeight: 44,
        maxWidth: 'min(420px, calc(100vw - 32px))',
        fontSize: 13.5,
        lineHeight: 1.35,
        opacity: leaving ? 0 : 1,
        transform: leaving ? 'translateY(8px)' : 'translateY(0)',
        transition: 'opacity 200ms ease, transform 200ms ease',
        pointerEvents: 'auto',
      }}
      onClick={() => dismiss(toast.id)}
    >
      <Icon name={meta.icon} size={18} />
      <span style={{ flex: 1 }}>{toast.message}</span>
    </div>
  );
}

export function ToastHost() {
  const toasts = useToastStore((s) => s.toasts);
  if (toasts.length === 0) return null;
  return (
    <div
      aria-live="polite"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 'calc(76px + env(safe-area-inset-bottom, 0px))',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        pointerEvents: 'none',
        zIndex: 1000,
        padding: '0 16px',
      }}
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}
