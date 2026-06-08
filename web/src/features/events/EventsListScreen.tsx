import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppBar } from '../../components/AppBar';
import { EmptyState } from '../../components/EmptyState';
import { Icon } from '../../components/Icon';
import { Chip } from '../../components/Pill';
import { EventCardSkeleton } from '../../components/Shimmer';
import { useCommunityEvents, useMyCommunities, type EventCard as EventCardData } from '../../lib/queries';
import { communityContext } from '../../lib/community-context';
import { fmtCents, fmtEventWhen } from '../../lib/format';
import { t } from '../../i18n';

type Tab = 'upcoming' | 'past' | 'all';
type View = 'list' | 'calendar';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function ymd(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function buildCalendarGrid(month: Date): Array<Date | null> {
  const first = startOfMonth(month);
  const startOffset = first.getDay(); // Sunday-first
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: Array<Date | null> = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(month.getFullYear(), month.getMonth(), d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function EventsListScreen() {
  const nav = useNavigate();
  const ctx = communityContext();
  const { data: mine } = useMyCommunities();
  const cid = ctx.currentCommunityId ?? mine?.[0]?.community.id;
  const [params, setParams] = useSearchParams();
  const view: View = params.get('view') === 'calendar' ? 'calendar' : 'list';
  const [tab, setTab] = useState<Tab>('upcoming');
  const [filterFree, setFilterFree] = useState(false);
  const { data: events, isLoading } = useCommunityEvents(
    cid,
    tab === 'past' ? 'completed' : tab === 'upcoming' ? 'published' : undefined,
  );

  const filtered = (events ?? []).filter((e) => (filterFree ? e.priceCents === 0 : true));

  const setView = (v: View) => {
    const next = new URLSearchParams(params);
    if (v === 'calendar') next.set('view', 'calendar');
    else next.delete('view');
    setParams(next, { replace: true });
  };

  return (
    <>
      <AppBar
        title={t.events.title}
        trailing={
          <div className="flex gap-1.5">
            <button className="ic-btn" aria-label="Filter">
              <Icon name="tune" />
            </button>
            <button
              onClick={() => setView(view === 'calendar' ? 'list' : 'calendar')}
              className={view === 'calendar' ? 'ic-btn soft' : 'ic-btn'}
              aria-label="Toggle calendar view"
            >
              <Icon name={view === 'calendar' ? 'view_agenda' : 'calendar_month'} />
            </button>
          </div>
        }
      />
      <div className="px-5">
        <div className="seg mb-3.5">
          {[
            { id: 'upcoming', label: t.events.upcoming },
            { id: 'past', label: t.events.past },
            { id: 'all', label: t.events.all },
          ].map((x) => (
            <span
              key={x.id}
              className={`s ${tab === x.id ? 'on' : ''}`}
              onClick={() => setTab(x.id as Tab)}
              style={{ cursor: 'pointer' }}
            >
              {x.label}
            </span>
          ))}
        </div>
        {view === 'list' && (
          <div className="hscroll pb-2">
            <Chip selected={!filterFree} onClick={() => setFilterFree(false)}>
              {t.events.filterAll}
            </Chip>
            <Chip selected={filterFree} onClick={() => setFilterFree(true)}>
              <span className="msr" style={{ fontSize: 16 }}>payments</span>
              {t.events.filterFree}
            </Chip>
            <Chip>This week</Chip>
          </div>
        )}
      </div>
      <main className="px-5 pb-6">
        {isLoading && (
          <div className="space-y-3">
            <EventCardSkeleton />
            <EventCardSkeleton />
            <EventCardSkeleton />
          </div>
        )}

        {!isLoading && view === 'list' && filtered.length === 0 && (
          <EmptyState
            icon="event_busy"
            title={tab === 'upcoming' ? 'No upcoming events' : 'No events found'}
            body="Join a community to see what's happening."
          />
        )}

        {!isLoading && view === 'list' && filtered.length > 0 && (
          <div className="space-y-3">
            <div className="t-label-sm mb-1 mt-1">{t.events.thisWeek}</div>
            {filtered.map((ev) => {
              const w = fmtEventWhen(ev.startAt);
              const remaining = ev.rsvpStats?.remaining;
              const going = ev.myRsvp?.status === 'going';
              return (
                <button
                  key={ev.id}
                  onClick={() => nav(`/events/${ev.id}`)}
                  className="event-card text-start w-full"
                >
                  <div className="cover imgph">
                    <span className="lbl">cover</span>
                  </div>
                  <div className="body">
                    <span className="when">{w.line}</span>
                    <span className="ttl">{ev.title}</span>
                    {ev.location?.name && (
                      <span className="meta">
                        <Icon name="place" size={14} />
                        {ev.location.name}
                      </span>
                    )}
                    <div className="foot">
                      <span
                        className={`price-tag ${ev.priceCents > 0 ? 'pt-paid' : 'pt-free'}`}
                      >
                        {ev.priceCents > 0 ? (
                          fmtCents(ev.priceCents)
                        ) : (
                          <>
                            <Icon name="check" size={14} />
                            {t.app.free}
                          </>
                        )}
                      </span>
                      {going ? (
                        <span
                          className="role-badge"
                          style={{
                            background: 'rgb(var(--success-wash))',
                            color: 'rgb(var(--success))',
                          }}
                        >
                          <Icon name="check_circle" size={13} />
                          {t.events.statusGoing}
                        </span>
                      ) : remaining != null && remaining > 0 && remaining <= 10 ? (
                        <span className="status-chip sc-pub">
                          {t.app.spotsLeft(remaining)}
                        </span>
                      ) : ev.rsvpStats?.going > 0 ? (
                        <span className="status-chip sc-pub">
                          {t.app.nGoing(ev.rsvpStats.going)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {!isLoading && view === 'calendar' && (
          <CalendarView events={events ?? []} onPick={(id) => nav(`/events/${id}`)} />
        )}
      </main>
    </>
  );
}

function CalendarView({
  events,
  onPick,
}: {
  events: EventCardData[];
  onPick: (id: string) => void;
}) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState(() => ymd(new Date()));

  const byDay = useMemo(() => {
    const map = new Map<string, EventCardData[]>();
    for (const ev of events) {
      const key = ymd(new Date(ev.startAt));
      const arr = map.get(key) ?? [];
      arr.push(ev);
      map.set(key, arr);
    }
    return map;
  }, [events]);

  const cells = buildCalendarGrid(month);
  const todayYmd = ymd(new Date());
  const dayEvents = byDay.get(selected) ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          className="ic-btn"
          aria-label="Previous month"
        >
          <Icon name="chevron_left" />
        </button>
        <div className="t-label-lg">
          {month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </div>
        <button
          onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          className="ic-btn"
          aria-label="Next month"
        >
          <Icon name="chevron_right" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="t-label-sm text-center" style={{ fontSize: 11 }}>
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 mb-4">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const key = ymd(d);
          const has = byDay.has(key);
          const isToday = key === todayYmd;
          const isSelected = key === selected;
          return (
            <button
              key={i}
              onClick={() => setSelected(key)}
              className="grid place-items-center relative"
              style={{
                aspectRatio: '1 / 1',
                borderRadius: 10,
                background: isSelected
                  ? 'rgb(var(--brand))'
                  : isToday
                  ? 'rgb(var(--brand-wash))'
                  : 'transparent',
                color: isSelected ? '#fff' : 'rgb(var(--on-bg))',
                fontWeight: isToday || isSelected ? 700 : 400,
                fontSize: 13,
              }}
            >
              {d.getDate()}
              {has && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: 4,
                    width: 5,
                    height: 5,
                    borderRadius: 999,
                    background: isSelected ? '#fff' : 'rgb(var(--brand))',
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="t-label-sm mb-2">
        {new Date(selected).toLocaleDateString(undefined, {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        })}
      </div>
      {dayEvents.length === 0 && (
        <EmptyState icon="event_busy" title="Nothing on this day" />
      )}
      <div className="space-y-3">
        {dayEvents.map((ev) => {
          const w = fmtEventWhen(ev.startAt);
          return (
            <button
              key={ev.id}
              onClick={() => onPick(ev.id)}
              className="event-card text-start w-full"
            >
              <div className="cover imgph">
                <span className="lbl">cover</span>
              </div>
              <div className="body">
                <span className="when">{w.line}</span>
                <span className="ttl">{ev.title}</span>
                {ev.location?.name && (
                  <span className="meta">
                    <Icon name="place" size={14} />
                    {ev.location.name}
                  </span>
                )}
                <div className="foot">
                  <span
                    className={`price-tag ${ev.priceCents > 0 ? 'pt-paid' : 'pt-free'}`}
                  >
                    {ev.priceCents > 0 ? (
                      fmtCents(ev.priceCents)
                    ) : (
                      <>
                        <Icon name="check" size={14} />
                        {t.app.free}
                      </>
                    )}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
