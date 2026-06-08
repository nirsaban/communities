import React from 'react';

type Tone = 'brand' | 'ok' | 'warn' | 'bad' | 'neutral';
const tones: Record<Tone, string> = {
  brand: 'bg-brand-wash text-brand-ink',
  ok: 'bg-ok-wash text-ok',
  warn: 'bg-warn-wash text-warn',
  bad: 'bg-bad-wash text-bad',
  neutral: 'bg-surface2 text-ink2',
};

export function Pill({ tone = 'neutral', children, className = '' }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}

// Uses the design-system .chip / .chip.active classes (Batch A).
export function Chip({
  selected,
  onClick,
  children,
}: {
  selected?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} className={`chip ${selected ? 'active' : ''}`}>
      {children}
    </button>
  );
}

// Design-system role / price / status badges. One thin React shell per .css class.
export type RoleKind = 'admin' | 'sub' | 'em' | 'member' | 'super';
const ROLE_META: Record<RoleKind, { icon: string; label: string }> = {
  admin: { icon: 'shield_person', label: 'Admin' },
  sub: { icon: 'badge', label: 'Sub Admin' },
  em: { icon: 'event', label: 'Event Mgr' },
  member: { icon: '', label: 'Member' },
  super: { icon: 'workspace_premium', label: 'Super' },
};
export function RoleBadge({ role, label }: { role: RoleKind; label?: string }) {
  const meta = ROLE_META[role];
  return (
    <span className={`role-badge rb-${role}`}>
      {meta.icon && <span className="msr">{meta.icon}</span>}
      {label ?? meta.label}
    </span>
  );
}

export type PriceKind = 'free' | 'paid' | 'sub';
export function PriceTag({ kind, amount }: { kind: PriceKind; amount?: string }) {
  return (
    <span className={`price-tag pt-${kind}`}>
      {kind === 'free' && <span className="msr" style={{ fontSize: 14 }}>check</span>}
      {kind === 'free' ? 'Free' : kind === 'sub' ? 'Subscription' : amount ?? ''}
    </span>
  );
}

export type EventStatusKind = 'draft' | 'pub' | 'cancel' | 'done';
const STATUS_LABEL: Record<EventStatusKind, string> = {
  draft: 'Draft',
  pub: 'Published',
  cancel: 'Cancelled',
  done: 'Completed',
};
export function StatusChip({ status, label }: { status: EventStatusKind; label?: string }) {
  return <span className={`status-chip sc-${status}`}>{label ?? STATUS_LABEL[status]}</span>;
}
