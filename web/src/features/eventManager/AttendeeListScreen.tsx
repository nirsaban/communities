// 42 · Attendee list — Event Manager check-in screen
// Design: commuinites_design/Batch C · 42 · Attendee list
// Layout: back + "Attendees · N" + QR scan button · search field · segmented
// (All / Going / Checked in / Waitlist) · attendee rows w/ check-in box trailing
// · "Check in all" FAB.

import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AppBar, Screen } from '../../components/AppBar';
import { Avatar } from '../../components/Avatar';
import { EmptyState } from '../../components/EmptyState';
import { Icon } from '../../components/Icon';
import { Shimmer } from '../../components/Shimmer';
import { useCheckInAll, useCheckInRsvp, useEventAttendees, type Attendee } from '../../lib/queries';

type Filter = 'all' | 'going' | 'checkedIn' | 'waitlist';

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'going', label: 'Going' },
  { id: 'checkedIn', label: 'Checked in' },
  { id: 'waitlist', label: 'Waitlist' },
];

export function AttendeeListScreen() {
  const { eid } = useParams<{ eid: string }>();
  const { data, isLoading } = useEventAttendees(eid);
  const checkIn = useCheckInRsvp(eid);
  const checkInAll = useCheckInAll(eid);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [scanOpen, setScanOpen] = useState(false);

  const visible = useMemo(() => filterAttendees(data ?? [], filter, search), [data, filter, search]);
  const goingCount = (data ?? []).filter((a) => a.status === 'going').length;
  const checkedInCount = (data ?? []).filter((a) => a.attendedAt).length;
  const uncheckedGoing = (data ?? []).filter((a) => a.status === 'going' && !a.attendedAt);

  return (
    <Screen>
      <AppBar
        back
        title={`Attendees · ${goingCount}`}
        trailing={
          <button
            type="button"
            className="ic-btn"
            onClick={() => setScanOpen(true)}
            aria-label="QR scan"
          >
            <Icon name="qr_code_scanner" />
          </button>
        }
      />

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
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              className={`s ${filter === f.id ? 'on' : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 px-5 pb-32">
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
          {visible.map((a) => (
            <AttendeeRow
              key={a.id}
              attendee={a}
              onToggle={() => checkIn.mutate(a.id)}
              busy={checkIn.isPending}
            />
          ))}
        </div>
      </main>

      {uncheckedGoing.length > 0 && (
        <button
          type="button"
          className="fab"
          onClick={() => checkInAll.mutate()}
          disabled={checkInAll.isPending}
        >
          <Icon name="how_to_reg" size={20} />
          Check in all
        </button>
      )}

      {scanOpen && (
        <ScanSheet onClose={() => setScanOpen(false)} />
      )}
    </Screen>
  );
}

function emptyTitleFor(f: Filter): string {
  if (f === 'going') return 'No attendees going yet';
  if (f === 'checkedIn') return 'No one is checked in';
  if (f === 'waitlist') return 'Waitlist is empty';
  return 'No attendees yet';
}

function filterAttendees(rows: Attendee[], f: Filter, search: string): Attendee[] {
  const term = search.trim().toLowerCase();
  return rows.filter((a) => {
    if (a.status === 'cancelled') return false;
    if (f === 'going' && a.status !== 'going') return false;
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

function ScanSheet({ onClose }: { onClose: () => void }) {
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
      onClick={onClose}
    >
      <div
        className="card"
        style={{ padding: 24, maxWidth: 340, width: '100%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-3">
          <Icon name="qr_code_scanner" size={22} />
          <span className="t-title-md">Scan to check in</span>
        </div>
        <div
          className="imgph"
          style={{ height: 200, borderRadius: 14, marginBottom: 16 }}
        >
          <span className="lbl">camera preview</span>
        </div>
        <p className="t-body-md" style={{ margin: 0, marginBottom: 16 }}>
          Point at an attendee's ticket QR. We check them in instantly.
        </p>
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
