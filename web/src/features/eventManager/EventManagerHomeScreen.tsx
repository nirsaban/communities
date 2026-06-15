// 40 · My Events — Event Manager home
// Design: commuinites_design/Batch C · 40 · My Events
// Surfaces only events the manager is assigned to (or admin/subadmin manages).
// Upcoming/Past segmented control + EventManageCard with RSVP/waitlist counts.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar, Screen } from '../../components/AppBar';
import { EmptyState } from '../../components/EmptyState';
import { Icon } from '../../components/Icon';
import { Shimmer } from '../../components/Shimmer';
import { fmtEventWhen } from '../../lib/format';
import { useMyManagedEvents, type EventCard } from '../../lib/queries';
import { useAuth } from '../../lib/auth';
import { Avatar } from '../../components/Avatar';

type Bucket = 'upcoming' | 'past';

const JUMP_SHORTCUT_KEY = 'em.home.jumpDismissed';

export function EventManagerHomeScreen() {
  const nav = useNavigate();
  const auth = useAuth();
  const [bucket, setBucket] = useState<Bucket>('upcoming');
  const { data, isLoading } = useMyManagedEvents(bucket);

  const items = useMemo(() => data ?? [], [data]);
  const activeCount = items.filter((e) => e.status === 'published').length;

  // If the EM only manages a single upcoming event, surface a "Jump to command
  // center" shortcut on first paint — they're almost always heading there
  // anyway. Dismissable per-session so we don't nag.
  const [jumpDismissed, setJumpDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.sessionStorage.getItem(JUMP_SHORTCUT_KEY) === '1';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    if (!jumpDismissed) return;
    try {
      window.sessionStorage.setItem(JUMP_SHORTCUT_KEY, '1');
    } catch {
      /* ignore */
    }
  }, [jumpDismissed]);

  const showJumpShortcut =
    bucket === 'upcoming' && !jumpDismissed && items.length === 1;
  const soleEventId = showJumpShortcut ? items[0].id : null;

  return (
    <Screen>
      <AppBar
        title="My events"
        subtitle={
          bucket === 'upcoming'
            ? `Event Manager · ${activeCount} active`
            : 'Event Manager · past events'
        }
        trailing={
          <div style={{ position: 'relative' }}>
            <Avatar name={auth.user?.name} size={36} />
            <span
              className="role-dot"
              aria-label="Event Manager"
              style={{
                position: 'absolute',
                bottom: -2,
                right: -2,
                width: 16,
                height: 16,
                borderRadius: 999,
                background: '#9A6B12',
                border: '2px solid rgb(var(--bg))',
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
              }}
              title="Event Manager"
            >
              <Icon name="event" size={10} />
            </span>
          </div>
        }
      />

      <div className="px-5">
        <div className="seg" style={{ marginBottom: 14 }} role="tablist">
          <button
            type="button"
            className={`s ${bucket === 'upcoming' ? 'on' : ''}`}
            onClick={() => setBucket('upcoming')}
            role="tab"
            aria-selected={bucket === 'upcoming'}
          >
            Upcoming
          </button>
          <button
            type="button"
            className={`s ${bucket === 'past' ? 'on' : ''}`}
            onClick={() => setBucket('past')}
            role="tab"
            aria-selected={bucket === 'past'}
          >
            Past
          </button>
        </div>
      </div>

      <main className="flex-1 px-5 pb-6 content-md lg:px-8">
        {showJumpShortcut && soleEventId && (
          <div
            className="card"
            style={{
              padding: 12,
              marginBottom: 14,
              background: 'rgb(var(--brand-wash))',
              borderColor: 'rgb(var(--brand-wash))',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Icon
              name="bolt"
              size={20}
              style={{ color: 'rgb(var(--brand-ink))' }}
            />
            <div className="grow flex-1 min-w-0">
              <div className="t-label-lg" style={{ fontSize: 13 }}>
                Jump to command center
              </div>
              <div
                className="t-body-md truncate"
                style={{ margin: 0, fontSize: 11 }}
              >
                {items[0].title}
              </div>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => nav(`/events/${soleEventId}/command`)}
            >
              Open
            </button>
            <button
              type="button"
              className="ic-btn"
              onClick={() => setJumpDismissed(true)}
              aria-label="Dismiss shortcut"
              style={{ width: 28, height: 28 }}
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        )}

        {isLoading && (
          <div className="space-y-3">
            <Shimmer style={{ height: 92, borderRadius: 12 }} />
            <Shimmer style={{ height: 92, borderRadius: 12 }} />
            <Shimmer style={{ height: 92, borderRadius: 12 }} />
          </div>
        )}

        {!isLoading && items.length === 0 && (
          <EmptyState
            icon={bucket === 'upcoming' ? 'event_busy' : 'history'}
            title={bucket === 'upcoming' ? 'Nothing to manage yet' : 'No past events'}
            body={
              bucket === 'upcoming'
                ? "Events you're assigned to will show up here"
                : "Past events you ran will appear here once they wrap"
            }
          />
        )}

        <div className="flex flex-col" style={{ gap: 11 }}>
          {items.map((ev) => (
            <EventManageCard key={ev.id} ev={ev} onClick={() => nav(`/events/${ev.id}/command`)} />
          ))}
        </div>
      </main>
    </Screen>
  );
}

function EventManageCard({ ev, onClick }: { ev: EventCard; onClick: () => void }) {
  const w = fmtEventWhen(ev.startAt);
  const isDraft = ev.status === 'draft';
  return (
    <button type="button" onClick={onClick} className="card text-start w-full" style={{ padding: 13 }}>
      <div className="row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span
          className="when"
          style={{
            color: isDraft ? 'rgb(var(--muted))' : 'rgb(var(--brand-ink))',
            fontWeight: 600,
            fontSize: 11.5,
          }}
        >
          {w.line}
        </span>
        <span className={`status-chip ${statusChipClass(ev.status)}`}>{statusLabel(ev.status)}</span>
      </div>
      <div className="t-title-md" style={{ marginBottom: 10 }}>
        {ev.title}
      </div>
      <div className="row" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        {isDraft ? (
          <span className="t-body-md" style={{ margin: 0 }}>Not published yet</span>
        ) : (
          <>
            <span className="t-body-md" style={{ margin: 0 }}>
              <b style={{ color: 'rgb(var(--on-bg))' }}>{ev.rsvpStats.going}</b> going
            </span>
            {ev.rsvpStats.waitlist > 0 && (
              <span className="t-body-md" style={{ margin: 0 }}>
                <b style={{ color: 'rgb(var(--on-bg))' }}>{ev.rsvpStats.waitlist}</b> waitlist
              </span>
            )}
          </>
        )}
        <span className="grow" style={{ flex: 1 }} />
        <span
          className="chip"
          style={{
            background: 'rgb(var(--brand))',
            color: '#fff',
            borderColor: 'transparent',
            height: 28,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Manage
          <Icon name="chevron_right" size={16} />
        </span>
      </div>
    </button>
  );
}

function statusChipClass(s: EventCard['status']): string {
  if (s === 'published') return 'sc-pub';
  if (s === 'cancelled') return 'sc-cancel';
  if (s === 'completed') return 'sc-done';
  return 'sc-draft';
}
function statusLabel(s: EventCard['status']): string {
  if (s === 'published') return 'Published';
  if (s === 'cancelled') return 'Cancelled';
  if (s === 'completed') return 'Completed';
  return 'Draft';
}
