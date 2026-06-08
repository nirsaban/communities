// 41 · Event command center — Event Manager hub
// Design: commuinites_design/Batch C · 41 · Event command center
// Layout: back + title + more-vert · EventHeaderCard with cover + status + title + meta
// · KPI row (Going / Checked in N/M) · 2x2 ActionTileGrid (Attendees / Materials / Q&A
// / Publish recap) · primary Broadcast button.

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
  const materialsCount = materials?.length ?? 0;
  const unansweredCount =
    qa?.filter((q) => !q.resolved && !q.answer).length ?? 0;
  const w = fmtEventWhen(ev.startAt);

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
      subtitle: ev.status === 'completed' ? 'Ready to share' : 'After the event',
      to: `/events/${eid}/recap/publish`,
      tone: 'ok',
    },
  ];

  return (
    <Screen>
      <AppBar
        back
        title="Command center"
        trailing={
          <button
            type="button"
            className="ic-btn"
            onClick={() => nav(`/events/${eid}`)}
            aria-label="Event details"
          >
            <Icon name="more_vert" />
          </button>
        }
      />
      <main className="flex-1 px-5 pb-6">
        {/* EventHeaderCard */}
        <div
          className="card"
          style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}
        >
          <div className="imgph" style={{ height: 96 }}>
            <span className="lbl">cover</span>
          </div>
          <div style={{ padding: 13 }}>
            <span className={`status-chip ${headerStatusClass(ev.status, isLive(ev.startAt, ev.endAt))}`}>
              {headerStatusLabel(ev.status, isLive(ev.startAt, ev.endAt))}
            </span>
            <div className="t-title-lg" style={{ fontSize: 18, margin: '6px 0 2px' }}>
              {ev.title}
            </div>
            <div className="t-body-md" style={{ margin: 0 }}>
              {w.line}
              {ev.location?.name ? ` · ${ev.location.name}` : ''}
            </div>
          </div>
        </div>

        {/* CheckInKPIs */}
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

        {/* ActionTileGrid */}
        <div className="grid grid-cols-2" style={{ gap: 11 }}>
          {tiles.map((t) => (
            <button
              key={t.title}
              type="button"
              onClick={() => nav(t.to)}
              className="tile text-start"
            >
              <span
                className="t-ic"
                style={{ background: TONE[t.tone].bg, color: TONE[t.tone].fg }}
              >
                <Icon name={t.icon} size={20} />
              </span>
              <div className="t-h">{t.title}</div>
              <div className="t-s">{t.subtitle}</div>
              {t.badge ? (
                <span
                  className="badge-dot"
                  style={{ position: 'absolute', top: 12, right: 12 }}
                >
                  {t.badge}
                </span>
              ) : null}
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

function isLive(startIso?: string, endIso?: string): boolean {
  if (!startIso) return false;
  const now = Date.now();
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : start + 1000 * 60 * 60 * 2;
  return now >= start && now <= end;
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
