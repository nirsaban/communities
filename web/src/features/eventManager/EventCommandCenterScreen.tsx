// 41 · Event command center — Event Manager hub
// Design: commuinites_design/Batch C · 41 · Event command center
// Layout: back + title + more-vert · EventHeaderCard with cover + status + title + meta
// · KPI row (Going / Checked in N/M) · 2x2 ActionTileGrid (Attendees / Materials / Q&A
// / Publish recap) · primary Broadcast button.

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppBar, Screen } from '../../components/AppBar';
import { Icon } from '../../components/Icon';
import { LoadingDots } from '../../components/LoadingDots';
import { useEvent, useEventAttendees, useEventMaterials, useEventQA } from '../../lib/queries';
import { fmtEventWhen } from '../../lib/format';

type TileTone = 'brand' | 'info' | 'plum' | 'ok';
type Tile = {
  icon: string;
  title: string;
  subtitle: string;
  badge?: number;
  to: string;
  tone: TileTone;
  disabled?: boolean;
  disabledHint?: string;
};

const TONE: Record<TileTone, { bg: string; fg: string }> = {
  brand: { bg: 'rgb(var(--brand-wash))', fg: 'rgb(var(--brand-ink))' },
  info: { bg: '#E1F1FA', fg: '#1F6F95' },
  plum: { bg: '#EFE7FF', fg: '#5B3D9E' },
  ok: { bg: 'rgb(var(--success-wash))', fg: 'rgb(var(--success))' },
};

export function EventCommandCenterScreen() {
  const { eid } = useParams<{ eid: string }>();
  const nav = useNavigate();
  const { data: ev } = useEvent(eid);
  const { data: attendees } = useEventAttendees(eid);
  const { data: materials } = useEventMaterials(eid);
  const { data: qa } = useEventQA(eid);

  if (!ev) {
    return (
      <Screen>
        <AppBar back title="Command center" />
        <div className="flex flex-1 items-center justify-center">
          <LoadingDots />
        </div>
      </Screen>
    );
  }

  const going = ev.rsvpStats.going;
  const waitlist = ev.rsvpStats.waitlist;
  const checkedIn = (attendees ?? []).filter((a) => a.attendedAt).length;
  const goingAttendees = (attendees ?? []).filter(
    (a) => a.status === 'going' || a.attendedAt,
  ).length;
  const noShow = Math.max(0, goingAttendees - checkedIn);
  const noShowPct =
    goingAttendees > 0 ? Math.round((noShow / goingAttendees) * 100) : 0;
  const materialsCount = materials?.length ?? 0;
  const unansweredCount =
    qa?.filter((q) => !q.resolved && !q.answer).length ?? 0;
  const w = fmtEventWhen(ev.startAt);
  const eventOver = isEventOver(ev.startAt, ev.endAt, ev.status);
  const recapReady = ev.status === 'completed' || eventOver;

  const tiles: Tile[] = [
    {
      icon: 'groups',
      title: 'Attendees',
      subtitle: `${going} going${waitlist ? ` · ${waitlist} waitlist` : ''}`,
      to: `/events/${eid}/attendees`,
      tone: 'brand',
    },
    {
      icon: 'folder',
      title: 'Materials',
      subtitle: `${materialsCount} ${materialsCount === 1 ? 'file' : 'files'}`,
      to: `/events/${eid}/materials`,
      tone: 'info',
    },
    {
      icon: 'forum',
      title: 'Q&A',
      subtitle: unansweredCount
        ? `${unansweredCount} unanswered`
        : 'All caught up',
      badge: unansweredCount || undefined,
      to: `/events/${eid}/qa`,
      tone: 'plum',
    },
    {
      icon: 'summarize',
      title: 'Publish recap',
      subtitle: recapReady ? 'Ready to share' : 'Unlocks after the event',
      to: `/events/${eid}/recap/publish`,
      tone: 'ok',
      disabled: !recapReady,
      disabledHint: 'Available once the event ends',
    },
  ];

  return (
    <Screen>
      <AppBar
        back
        title="Command center"
        subtitle={`${ev.title} · ${w.line}`}
        trailing={
          <button
            type="button"
            className="ic-btn"
            onClick={() => nav(`/events/${eid}`)}
            aria-label="Preview as attendee"
            title="Preview as attendee"
          >
            <Icon name="visibility" />
          </button>
        }
      />
      <main className="flex-1 px-5 pb-6">
        {/* EventHeaderCard */}
        <div
          className="card"
          style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}
        >
          <EventCover title={ev.title} coverUrl={ev.coverUrl} />
          <div style={{ padding: 13 }}>
            <div
              className="row"
              style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}
            >
              <span className={`status-chip ${headerStatusClass(ev.status, isLive(ev.startAt, ev.endAt))}`}>
                {headerStatusLabel(ev.status, isLive(ev.startAt, ev.endAt))}
              </span>
              <CountdownChip startIso={ev.startAt} endIso={ev.endAt} status={ev.status} />
            </div>
            <div className="t-title-lg" style={{ fontSize: 18, margin: '6px 0 2px' }}>
              {ev.title}
            </div>
            <div className="t-body-md" style={{ margin: 0 }}>
              {w.line}
              {ev.location?.name ? ` · ${ev.location.name}` : ''}
            </div>
          </div>
        </div>

        {/* CheckInKPIs — swap to attended / no-show once the event is over */}
        {eventOver ? (
          <div className="row" style={{ display: 'flex', gap: 11, marginBottom: 16 }}>
            <div className="kpi grow" style={{ flex: 1 }}>
              <div className="k-lbl">
                <Icon name="how_to_reg" size={15} />
                Attended
              </div>
              <div className="k-num">{checkedIn}</div>
            </div>
            <div className="kpi grow" style={{ flex: 1 }}>
              <div className="k-lbl">
                <Icon name="event_available" size={15} />
                RSVP'd
              </div>
              <div className="k-num">{goingAttendees}</div>
            </div>
            <div className="kpi grow" style={{ flex: 1 }}>
              <div className="k-lbl">
                <Icon name="event_busy" size={15} />
                No-show
              </div>
              <div className="k-num">
                {noShowPct}
                <span style={{ fontSize: 15, color: 'rgb(var(--muted))' }}>%</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="row" style={{ display: 'flex', gap: 11, marginBottom: 16 }}>
            <div className="kpi grow" style={{ flex: 1 }}>
              <div className="k-lbl">
                <Icon name="how_to_reg" size={15} />
                Going
              </div>
              <div className="k-num">{going}</div>
            </div>
            <div className="kpi grow" style={{ flex: 1 }}>
              <div className="k-lbl">
                <Icon name="co_present" size={15} />
                Checked in
              </div>
              <div className="k-num">
                {checkedIn}
                <span style={{ fontSize: 15, color: 'rgb(var(--muted))' }}> / {going}</span>
              </div>
            </div>
          </div>
        )}

        {/* ActionTileGrid */}
        <div className="grid grid-cols-2" style={{ gap: 11 }}>
          {tiles.map((t) => (
            <button
              key={t.title}
              type="button"
              onClick={() => !t.disabled && nav(t.to)}
              className="tile text-start"
              disabled={t.disabled}
              aria-disabled={t.disabled}
              title={t.disabled ? t.disabledHint : undefined}
              style={t.disabled ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}
            >
              <span
                className="t-ic"
                style={{ background: TONE[t.tone].bg, color: TONE[t.tone].fg }}
              >
                <Icon name={t.icon} size={20} />
              </span>
              <div className="t-h">{t.title}</div>
              <div className="t-s">
                {t.disabled && t.disabledHint ? t.disabledHint : t.subtitle}
              </div>
              {t.badge ? (
                <span
                  className="badge-dot"
                  style={{ position: 'absolute', top: 12, right: 12 }}
                >
                  {t.badge}
                </span>
              ) : null}
              {t.disabled && (
                <span
                  style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    color: 'rgb(var(--muted))',
                  }}
                >
                  <Icon name="lock" size={14} />
                </span>
              )}
            </button>
          ))}
        </div>

        {/* BroadcastButton */}
        <button
          type="button"
          className="btn btn-primary"
          style={{ marginTop: 16 }}
          onClick={() => nav(`/events/${eid}/broadcast`)}
        >
          <Icon name="campaign" size={20} />
          Broadcast to attendees
        </button>
      </main>
    </Screen>
  );
}

// Tinted gradient placeholder anchored to the event title's first letter — far
// less embarrassing than a grey block with the literal word "cover" when no
// cover photo has been uploaded yet.
function EventCover({ title, coverUrl }: { title: string; coverUrl?: string }) {
  if (coverUrl) {
    return (
      <div
        style={{
          height: 96,
          width: '100%',
          backgroundImage: `url(${coverUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        aria-label="Event cover"
      />
    );
  }
  const initial = (title?.trim()?.[0] ?? '?').toUpperCase();
  return (
    <div
      style={{
        height: 96,
        width: '100%',
        background:
          'linear-gradient(135deg, rgb(var(--brand-wash)) 0%, rgb(var(--brand)) 100%)',
        display: 'grid',
        placeItems: 'center',
        color: '#fff',
      }}
      aria-hidden
    >
      <span
        style={{
          fontSize: 38,
          fontWeight: 700,
          letterSpacing: 1,
          textShadow: '0 1px 2px rgba(0,0,0,0.15)',
        }}
      >
        {initial}
      </span>
    </div>
  );
}

// Live "starts in 2h 14m" chip — only renders while the event is in the future
// and within 24h of starting. Updates on a 30s tick so the EM sees the value
// tighten as start approaches.
function CountdownChip({
  startIso,
  endIso,
  status,
}: {
  startIso: string;
  endIso?: string;
  status: string;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  if (status === 'cancelled' || status === 'completed') return null;
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : start + 1000 * 60 * 60 * 2;
  if (now >= start && now <= end) return null; // live banner handled by status chip
  const diff = start - now;
  if (diff <= 0) return null;
  if (diff > 1000 * 60 * 60 * 24) return null;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const label =
    hours > 0 ? `Starts in ${hours}h ${minutes}m` : `Starts in ${minutes}m`;
  return (
    <span
      className="status-chip"
      style={{
        background: 'rgb(var(--brand-wash))',
        color: 'rgb(var(--brand-ink))',
      }}
    >
      <Icon name="schedule" size={12} />
      {label}
    </span>
  );
}

function isLive(startIso?: string, endIso?: string): boolean {
  if (!startIso) return false;
  const now = Date.now();
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : start + 1000 * 60 * 60 * 2;
  return now >= start && now <= end;
}
function isEventOver(startIso?: string, endIso?: string, status?: string): boolean {
  if (status === 'completed') return true;
  if (status === 'cancelled') return false;
  if (!startIso) return false;
  const now = Date.now();
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : start + 1000 * 60 * 60 * 2;
  return now > end;
}
function headerStatusClass(s: string, live: boolean): string {
  if (live) return 'sc-pub';
  if (s === 'published') return 'sc-pub';
  if (s === 'cancelled') return 'sc-cancel';
  if (s === 'completed') return 'sc-done';
  return 'sc-draft';
}
function headerStatusLabel(s: string, live: boolean): string {
  if (live) return 'Live tonight';
  if (s === 'published') return 'Published';
  if (s === 'cancelled') return 'Cancelled';
  if (s === 'completed') return 'Completed';
  return 'Draft';
}
