import React from 'react';

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-ink-800 bg-ink-900/50 backdrop-blur ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  hint,
  right,
}: {
  title: string;
  hint?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between border-b border-ink-800 px-4 py-3">
      <div>
        <h2 className="text-sm font-semibold text-ink-100">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-ink-500">{hint}</p>}
      </div>
      {right}
    </div>
  );
}

export function CardBody({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`p-4 ${className}`}>{children}</div>;
}

export function Pill({
  tone = 'neutral',
  children,
}: {
  tone?: 'ok' | 'warn' | 'bad' | 'neutral' | 'info';
  children: React.ReactNode;
}) {
  const map: Record<string, string> = {
    ok: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    warn: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    bad: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    neutral: 'bg-ink-800 text-ink-300 border-ink-700',
    info: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${map[tone]}`}
    >
      {children}
    </span>
  );
}

export function Mono({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <span className={`font-mono text-xs ${className}`}>{children}</span>;
}

export function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: 'ok' | 'warn' | 'bad';
}) {
  const toneClass =
    tone === 'ok'
      ? 'text-emerald-300'
      : tone === 'warn'
        ? 'text-amber-300'
        : tone === 'bad'
          ? 'text-rose-300'
          : 'text-ink-100';
  return (
    <div className="rounded-md border border-ink-800 bg-ink-900/40 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-ink-500">{label}</div>
      <div className={`mt-0.5 text-lg font-semibold tabular-nums ${toneClass}`}>{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-ink-500">{hint}</div>}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-ink-700 px-4 py-6 text-center text-xs text-ink-500">
      {children}
    </div>
  );
}
