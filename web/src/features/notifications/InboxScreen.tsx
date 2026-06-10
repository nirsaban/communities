import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar } from '../../components/AppBar';
import { Chip } from '../../components/Pill';
import { EmptyState } from '../../components/EmptyState';
import { Icon } from '../../components/Icon';
import { Shimmer } from '../../components/Shimmer';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  type Notification,
} from '../../lib/queries';

// Buckets map every backend notification type into one of four meaningful
// member-facing groups. Anything we don't recognize stays under "Other"
// (the All chip still shows it).
type FilterId = 'all' | 'events' | 'community' | 'payments';
const TYPE_GROUP: Record<string, Exclude<FilterId, 'all'>> = {
  event: 'events',
  rsvp: 'events',
  waitlist: 'events',
  qa: 'events',
  post: 'community',
  initiative: 'community',
  payment: 'payments',
  refund: 'payments',
  subscription: 'payments',
};

const FILTERS: Array<{ id: FilterId; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'events', label: 'Events' },
  { id: 'community', label: 'Community' },
  { id: 'payments', label: 'Payments' },
];

function fmtAgo(iso: string): string {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const TYPE_ICON: Record<string, { icon: string; bg: string; color: string }> = {
  event: { icon: 'event', bg: 'rgb(var(--surface-2))', color: 'rgb(var(--on-bg-2))' },
  rsvp: { icon: 'event_available', bg: 'rgb(var(--success-wash))', color: 'rgb(var(--success))' },
  qa: { icon: 'forum', bg: 'rgb(var(--brand-wash))', color: 'rgb(var(--brand-ink))' },
  post: { icon: 'forum', bg: 'rgb(var(--brand-wash))', color: 'rgb(var(--brand-ink))' },
  initiative: { icon: 'favorite', bg: 'rgb(var(--success-wash))', color: 'rgb(var(--success))' },
  payment: { icon: 'receipt_long', bg: 'rgb(var(--surface-2))', color: 'rgb(var(--on-bg-2))' },
  waitlist: { icon: 'bolt', bg: 'rgb(var(--warning-wash))', color: 'rgb(var(--warning))' },
  info: { icon: 'info', bg: 'rgb(var(--surface-2))', color: 'rgb(var(--on-bg-2))' },
};

function bucket(iso: string): 'today' | 'earlier' {
  const created = new Date(iso);
  const now = new Date();
  const sameDay =
    created.getFullYear() === now.getFullYear() &&
    created.getMonth() === now.getMonth() &&
    created.getDate() === now.getDate();
  return sameDay ? 'today' : 'earlier';
}

export function InboxScreen() {
  const nav = useNavigate();
  const { data, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const unread = (data ?? []).filter((n) => !n.read).length;
  const [filter, setFilter] = useState<FilterId>('all');

  // Promote a single actionable waitlist notification into the announce banner.
  const actionable = (data ?? []).find(
    (n) => !n.read && (n.type === 'waitlist' || /waitlist/i.test(n.title ?? '')),
  );

  // Per-group unread counts power the chip badges so members can scan how much
  // is waiting in each bucket without opening it.
  const groupUnread = useMemo(() => {
    const out: Record<FilterId, number> = { all: 0, events: 0, community: 0, payments: 0 };
    for (const n of data ?? []) {
      if (n.read) continue;
      out.all += 1;
      const g = TYPE_GROUP[n.type];
      if (g) out[g] += 1;
    }
    return out;
  }, [data]);

  const { today, earlier } = useMemo(() => {
    const list = (data ?? [])
      .filter((n) => n.id !== actionable?.id)
      .filter((n) => filter === 'all' || TYPE_GROUP[n.type] === filter);
    const tToday: Notification[] = [];
    const tEarlier: Notification[] = [];
    for (const n of list) {
      (bucket(n.createdAt) === 'today' ? tToday : tEarlier).push(n);
    }
    return { today: tToday, earlier: tEarlier };
  }, [data, actionable, filter]);

  return (
    <>
      <AppBar
        title="Inbox"
        trailing={
          unread > 0 ? (
            <button
              onClick={() => markAll.mutate()}
              className="ic-btn"
              aria-label="Mark all read"
            >
              <Icon name="done_all" />
            </button>
          ) : (
            <button
              onClick={() => nav('/me/notifications/prefs')}
              className="ic-btn"
              aria-label="Notification preferences"
            >
              <Icon name="tune" />
            </button>
          )
        }
      />
      {!isLoading && data && data.length > 0 && (
        <div className="px-5">
          <div className="hscroll pb-2">
            {FILTERS.map((f) => (
              <Chip
                key={f.id}
                selected={filter === f.id}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
                {groupUnread[f.id] > 0 && (
                  <span
                    style={{
                      marginInlineStart: 6,
                      background: filter === f.id ? 'rgba(255,255,255,0.25)' : 'rgb(var(--brand))',
                      color: '#fff',
                      borderRadius: 999,
                      padding: '0 6px',
                      fontSize: 10,
                      fontWeight: 700,
                      lineHeight: '16px',
                      minWidth: 16,
                      display: 'inline-block',
                      textAlign: 'center',
                    }}
                  >
                    {groupUnread[f.id]}
                  </span>
                )}
              </Chip>
            ))}
          </div>
        </div>
      )}
      <main className="px-5 pb-6">
        {isLoading && (
          <div className="space-y-3">
            <Shimmer style={{ height: 64 }} />
            <Shimmer style={{ height: 64 }} />
          </div>
        )}

        {!isLoading && (!data || data.length === 0) && (
          <EmptyState
            icon="notifications_off"
            title="You're all caught up"
            body="When something happens in your communities, it lands here."
          />
        )}

        {!isLoading && data && data.length > 0 && today.length === 0 && earlier.length === 0 && !actionable && (
          <EmptyState
            icon="filter_alt_off"
            title="Nothing in this filter"
            body="Try a different category or jump back to All."
          />
        )}

        {actionable && (
          <button
            className="card announce flex w-full items-center gap-3 text-start"
            style={{ marginBottom: 16, padding: 14 }}
            onClick={() => {
              if (!actionable.read) markRead.mutate(actionable.id);
            }}
          >
            <Icon name="bolt" style={{ color: 'rgb(var(--brand-ink))' }} />
            <div className="flex-1">
              <div className="t-label-lg">{actionable.title}</div>
              <div className="t-body-md" style={{ margin: 0 }}>
                {actionable.body}
              </div>
            </div>
            <span
              className="chip"
              style={{
                background: 'rgb(var(--brand))',
                color: '#fff',
                borderColor: 'transparent',
                height: 30,
                fontSize: 11.5,
              }}
            >
              Claim
            </span>
          </button>
        )}

        {today.length > 0 && (
          <div className="t-label-sm" style={{ marginBottom: 4 }}>
            Today
          </div>
        )}
        <div className="flex flex-col">
          {today.map((n) => (
            <NotificationRow key={n.id} n={n} onTap={() => !n.read && markRead.mutate(n.id)} />
          ))}
        </div>

        {earlier.length > 0 && (
          <div className="t-label-sm" style={{ margin: '10px 0 4px' }}>
            Earlier
          </div>
        )}
        <div className="flex flex-col">
          {earlier.map((n) => (
            <NotificationRow key={n.id} n={n} onTap={() => !n.read && markRead.mutate(n.id)} />
          ))}
        </div>
      </main>
    </>
  );
}

function NotificationRow({ n, onTap }: { n: Notification; onTap: () => void }) {
  const meta = TYPE_ICON[n.type] ?? TYPE_ICON.info;
  return (
    <button onClick={onTap} className="notif text-start w-full">
      <span className="ic" style={{ background: meta.bg, color: meta.color }}>
        <Icon name={meta.icon} size={20} />
      </span>
      <div className="flex-1">
        <div className="t-body-lg" style={{ fontSize: 14 }}>
          {n.title}
        </div>
        {n.body && (
          <div className="t-body-md" style={{ margin: '2px 0 0', fontSize: 11 }}>
            {fmtAgo(n.createdAt)} · {n.body}
          </div>
        )}
        {!n.body && (
          <div className="t-body-md" style={{ margin: '2px 0 0', fontSize: 11 }}>
            {fmtAgo(n.createdAt)}
          </div>
        )}
      </div>
      {!n.read && (
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'rgb(var(--brand))',
            marginTop: 6,
            flexShrink: 0,
          }}
        />
      )}
    </button>
  );
}
