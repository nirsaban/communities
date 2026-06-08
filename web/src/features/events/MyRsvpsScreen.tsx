import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar, Screen } from '../../components/AppBar';
import { EmptyState } from '../../components/EmptyState';
import { Icon } from '../../components/Icon';
import { EventCardSkeleton } from '../../components/Shimmer';
import { PriceTag } from '../../components/Pill';
import { useMyRsvps } from '../../lib/queries';
import { fmtCents, fmtEventWhen } from '../../lib/format';
import { t } from '../../i18n';

export function MyRsvpsScreen() {
  const nav = useNavigate();
  const { data, isLoading } = useMyRsvps();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');

  const now = Date.now();
  const filtered = (data ?? []).filter((r) => {
    const ts = new Date(r.event.startAt).getTime();
    return tab === 'upcoming' ? ts >= now : ts < now;
  });

  return (
    <Screen>
      <AppBar back title={t.events.myRsvps} />
      <div className="px-5">
        <div className="seg mb-3.5">
          {[
            { id: 'upcoming', label: t.events.upcoming },
            { id: 'past', label: t.events.past },
          ].map((x) => (
            <button
              key={x.id}
              className={`s ${tab === x.id ? 'on' : ''}`}
              onClick={() => setTab(x.id as 'upcoming' | 'past')}
            >
              {x.label}
            </button>
          ))}
        </div>
      </div>
      <main className="px-5 pb-6">
        {isLoading && (
          <div className="space-y-3">
            <EventCardSkeleton />
            <EventCardSkeleton />
          </div>
        )}
        {!isLoading && filtered.length === 0 && (
          <EmptyState
            icon="event_busy"
            title={t.events.myRsvpsEmpty}
            body={t.events.myRsvpsEmptyBody}
          />
        )}
        <div className="space-y-3">
          {filtered.map((r) => {
            const w = fmtEventWhen(r.event.startAt);
            const isPaid = r.event.priceCents > 0;
            return (
              <button
                key={r.id}
                onClick={() => nav(`/events/${r.event.id}`)}
                className="event-card text-start w-full"
              >
                <div className="cover imgph">
                  <span className="lbl">cover</span>
                </div>
                <div className="body">
                  <span className="when">{w.line}</span>
                  <span className="ttl">{r.event.title}</span>
                  <div className="foot">
                    {r.status === 'going' && (
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
                    )}
                    {r.status === 'waitlist' && (
                      <span
                        className="role-badge"
                        style={{
                          background: 'rgb(var(--warning-wash))',
                          color: 'rgb(var(--warning))',
                        }}
                      >
                        <Icon name="hourglass_top" size={13} />
                        {t.events.statusWaitlist}
                      </span>
                    )}
                    {r.status !== 'going' && r.status !== 'waitlist' && (
                      <PriceTag
                        kind={isPaid ? 'paid' : 'free'}
                        amount={
                          isPaid
                            ? `${t.events.statusPaid} · ${fmtCents(r.event.priceCents)}`
                            : undefined
                        }
                      />
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </main>
    </Screen>
  );
}
