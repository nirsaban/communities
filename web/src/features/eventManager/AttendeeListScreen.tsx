// 42 · Attendee list — Event Manager check-in screen
// Design: commuinites_design/Batch C · 42 · Attendee list
// Layout: back + "Attendees · N" + event-name subtitle · search field · segmented
// (All / Arriving / Checked in / Waitlist) · attendee rows w/ check-in box trailing
// · "Check in all" FAB (with confirm sheet).

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AppBar, Screen } from '../../components/AppBar';
import { Avatar } from '../../components/Avatar';
import { EmptyState } from '../../components/EmptyState';
import { Icon } from '../../components/Icon';
import { Shimmer } from '../../components/Shimmer';
import { fmtEventWhen } from '../../lib/format';
import {
  useCheckInAll,
  useCheckInRsvp,
  useEvent,
  useEventAttendees,
  type Attendee,
} from '../../lib/queries';

type Filter = 'all' | 'arriving' | 'checkedIn' | 'waitlist';

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'arriving', label: 'Arriving' },
  { id: 'checkedIn', label: 'Checked in' },
  { id: 'waitlist', label: 'Waitlist' },
];

const PAGE_SIZE = 50;

export function AttendeeListScreen() {
  const { eid } = useParams<{ eid: string }>();
  const { data: ev } = useEvent(eid);
  const { data, isLoading } = useEventAttendees(eid);
  const checkIn = useCheckInRsvp(eid);
  const checkInAll = useCheckInAll(eid);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [confirmAll, setConfirmAll] = useState(false);
  // Client-side pagination. The /rsvps endpoint returns the full list today,
  // so for 200+ attendee events we'd render 200 rows. We slice and let the EM
  // tap "Show more" to grow the window — keeps initial scroll responsive and
  // prevents jank when toggling check-in at the bottom of a huge list.
  const [visibleLimit, setVisibleLimit] = useState(PAGE_SIZE);

  const visible = useMemo(() => filterAttendees(data ?? [], filter, search), [data, filter, search]);
  const goingCount = (data ?? []).filter((a) => a.status === 'going').length;
  const checkedInCount = (data ?? []).filter((a) => a.attendedAt).length;
  const waitlistCount = (data ?? []).filter((a) => a.status === 'waitlist').length;
  const uncheckedGoing = (data ?? []).filter((a) => a.status === 'going' && !a.attendedAt);
  const pageVisible = visible.slice(0, visibleLimit);
  const hiddenCount = Math.max(0, visible.length - pageVisible.length);

  // When the filter or search narrows the active list, reset the window so the
  // user always sees results from the top.
  useEffect(() => {
    setVisibleLimit(PAGE_SIZE);
  }, [filter, search]);

  const subtitle = ev
    ? `${ev.title} · ${fmtEventWhen(ev.startAt).line}`
    : undefined;

  return (
    <Screen>
      <AppBar back title={`Attendees · ${goingCount}`} subtitle={subtitle} />

      <div className="px-5">
        <div
          className="control"
          style={{
            height: 44,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '0 14px',
            background: 'rgb(var(--surface-2))',
            border: 'none',
            borderRadius: 999,
            marginBottom: 10,
          }}
        >
          <Icon name="search" size={18} className="muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search attendees…"
            className="grow w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
          />
        </div>
        <div className="seg" style={{ marginBottom: 8 }} role="tablist">
          {FILTERS.map((f) => {
            const count =
              f.id === 'arriving'
                ? uncheckedGoing.length
                : f.id === 'checkedIn'
                  ? checkedInCount
                  : f.id === 'waitlist'
                    ? waitlistCount
                    : (data ?? []).filter((a) => a.status !== 'cancelled').length;
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={filter === f.id}
                className={`s ${filter === f.id ? 'on' : ''}`}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
                {data && (
                  <span
                    className="t-label-sm"
                    style={{ marginInlineStart: 4, opacity: 0.7 }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <main className="flex-1 px-5 pb-32 content-md lg:px-8">
        {isLoading && (
          <div className="space-y-2">
            <Shimmer style={{ height: 56 }} />
            <Shimmer style={{ height: 56 }} />
            <Shimmer style={{ height: 56 }} />
          </div>
        )}

        {!isLoading && visible.length === 0 && (
          <EmptyState
            icon="group_off"
            title={search ? 'No matches' : emptyTitleFor(filter)}
            body={search ? 'Try a different search.' : undefined}
          />
        )}

        <div className="flex flex-col">
          {pageVisible.map((a) => (
            <AttendeeRow
              key={a.id}
              attendee={a}
              onToggle={() => checkIn.mutate(a.id)}
              busy={checkIn.isPending}
            />
          ))}
        </div>

        {hiddenCount > 0 && (
          <button
            type="button"
            className="btn btn-secondary"
            style={{ marginTop: 12 }}
            onClick={() => setVisibleLimit((n) => n + PAGE_SIZE)}
          >
            Show {Math.min(hiddenCount, PAGE_SIZE)} more
            <span className="t-label-sm" style={{ marginInlineStart: 6, opacity: 0.7 }}>
              · {hiddenCount} hidden
            </span>
          </button>
        )}
      </main>

      {uncheckedGoing.length > 0 && (
        <button
          type="button"
          className="fab"
          onClick={() => setConfirmAll(true)}
          disabled={checkInAll.isPending}
        >
          <Icon name="how_to_reg" size={20} />
          Check in all
        </button>
      )}

      {confirmAll && (
        <ConfirmCheckInAllSheet
          count={uncheckedGoing.length}
          pending={checkInAll.isPending}
          onCancel={() => setConfirmAll(false)}
          onConfirm={() => {
            checkInAll.mutate(undefined, {
              onSettled: () => setConfirmAll(false),
            });
          }}
        />
      )}
    </Screen>
  );
}

function emptyTitleFor(f: Filter): string {
  if (f === 'arriving') return 'Everyone going is checked in';
  if (f === 'checkedIn') return 'No one is checked in';
  if (f === 'waitlist') return 'Waitlist is empty';
  return 'No attendees yet';
}

function filterAttendees(rows: Attendee[], f: Filter, search: string): Attendee[] {
  const term = search.trim().toLowerCase();
  return rows.filter((a) => {
    if (a.status === 'cancelled') return false;
    // "Arriving" and "Checked in" are mutually exclusive: Arriving = RSVPed but
    // not yet checked in, Checked in = at the door. Without this split the
    // EM sees the same row in both tabs and can't triage who still needs to
    // arrive vs who's already inside.
    if (f === 'arriving' && (a.status !== 'going' || !!a.attendedAt)) return false;
    if (f === 'checkedIn' && !a.attendedAt) return false;
    if (f === 'waitlist' && a.status !== 'waitlist') return false;
    if (term) {
      const hay = `${a.name} ${a.email}`.toLowerCase();
      if (!hay.includes(term)) return false;
    }
    return true;
  });
}

function AttendeeRow({
  attendee,
  onToggle,
  busy,
}: {
  attendee: Attendee;
  onToggle: () => void;
  busy: boolean;
}) {
  const meta = describeMeta(attendee);
  const isWaitlist = attendee.status === 'waitlist';
  const checked = !!attendee.attendedAt;
  return (
    <div className="list-row">
      <Avatar name={attendee.name} src={attendee.photoUrl} size={40} />
      <div className="flex-1 min-w-0">
        <div className="t-label-lg truncate">{attendee.name}</div>
        {isWaitlist ? (
          <div className="row" style={{ display: 'flex', gap: 5, marginTop: 2 }}>
            <span
              className="role-badge rb-em"
              style={{ height: 18, fontSize: 10 }}
            >
              <Icon name="hourglass_top" size={11} />
              {`Waitlist #${attendee.waitlistPosition ?? '-'}`}
            </span>
          </div>
        ) : (
          <div className="t-body-md" style={{ margin: 0, fontSize: 11 }}>
            {meta}
          </div>
        )}
      </div>
      {isWaitlist ? (
        <span className="ck" aria-hidden />
      ) : (
        <button
          type="button"
          className={`ck ${checked ? 'on' : ''}`}
          onClick={onToggle}
          disabled={busy}
          aria-label={checked ? 'Mark not attended' : 'Check in'}
        >
          {checked && <Icon name="check" size={17} />}
        </button>
      )}
    </div>
  );
}

function describeMeta(a: Attendee): string {
  if (!a.createdAt) return '';
  const ms = Date.now() - new Date(a.createdAt).getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days <= 0) return "RSVP'd today";
  if (days === 1) return "RSVP'd yesterday";
  if (days < 30) return `RSVP'd ${days} days ago`;
  const months = Math.floor(days / 30);
  return `RSVP'd ${months} mo ago`;
}

function ConfirmCheckInAllSheet({
  count,
  pending,
  onCancel,
  onConfirm,
}: {
  count: number;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 50,
        display: 'grid',
        placeItems: 'center',
        padding: 24,
      }}
      onClick={pending ? undefined : onCancel}
    >
      <div
        className="card"
        style={{ padding: 20, maxWidth: 340, width: '100%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="t-title-md" style={{ marginBottom: 6 }}>
          Check in {count} {count === 1 ? 'attendee' : 'attendees'}?
        </div>
        <p className="t-body-md" style={{ margin: '0 0 14px' }}>
          Marks everyone currently arriving as checked in. You can uncheck
          individuals after.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={pending}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? 'Checking in…' : 'Check in all'}
          </button>
        </div>
      </div>
    </div>
  );
}
