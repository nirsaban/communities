import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar, Screen } from '../../components/AppBar';
import { AppButton } from '../../components/AppButton';
import { EmptyState } from '../../components/EmptyState';
import { Icon } from '../../components/Icon';
import { PriceTag, StatusChip } from '../../components/Pill';
import { EventCardSkeleton } from '../../components/Shimmer';
import { communityContext } from '../../lib/community-context';
import { fmtCents, fmtEventWhen } from '../../lib/format';
import { useCommunityEvents, useMyCommunities } from '../../lib/queries';

// Three-tab segmented control per design unit 52.
type Tab = 'published' | 'drafts' | 'past';

const TAB_LABELS: Record<Tab, string> = {
  published: 'Published',
  drafts: 'Drafts',
  past: 'Past',
};

export function AdminEventListScreen() {
  const nav = useNavigate();
  const ctx = communityContext();
  const { data: mine } = useMyCommunities();
  const cid = ctx.currentCommunityId ?? mine?.[0]?.community.id;
  const myRole = mine?.find((m) => m.community.id === cid)?.membership.role;
  const isSubAdmin = myRole === 'subadmin';
  const [tab, setTab] = useState<Tab>('published');

  // Pull a broader set, filter client-side so the tabs are instant.
  const { data: events, isLoading } = useCommunityEvents(cid);

  const filtered = useMemo(() => {
    if (!events) return [];
    const now = Date.now();
    return events.filter((ev) => {
      const start = new Date(ev.startAt).getTime();
      const isPast = ev.status === 'completed' || (ev.status === 'published' && start < now);
      if (tab === 'drafts') return ev.status === 'draft';
      if (tab === 'past') return isPast || ev.status === 'cancelled';
      // published tab → upcoming published events only
      return ev.status === 'published' && start >= now;
    });
  }, [events, tab]);

  return (
    <Screen>
      <AppBar back title="Events" />
      <main className="flex-1 px-5 pb-6 content-wide lg:px-8">
        <div className="seg mb-4">
          {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`s ${tab === t ? 'on' : ''}`}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="space-y-3">
            <EventCardSkeleton />
            <EventCardSkeleton />
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <EmptyState
            icon="event_busy"
            title={tab === 'drafts' ? 'No drafts' : tab === 'past' ? 'Nothing past yet' : 'No upcoming events'}
            body={tab === 'published' ? "Create the community's next event" : undefined}
            action={
              tab === 'published' ? (
                <AppButton onClick={() => nav('/admin/events/new')}>New event</AppButton>
              ) : undefined
            }
          />
        )}

        <div className="space-y-2.5">
          {filtered.map((ev) => {
            const w = fmtEventWhen(ev.startAt);
            const isDraft = ev.status === 'draft';
            const isCancelled = ev.status === 'cancelled';
            const isCompleted = ev.status === 'completed';
            const isPaid = ev.priceCents > 0;
            // Subscription-gated events also count as "not free" — a sub-admin must
            // see them as "Paid" rather than the previous "Free" fall-through (lie)
            // or a "Subs" pill that leaks the subscription system.
            const isSubsGated =
              ev.pricingType === 'subscription_only' || ev.pricingType === 'subscription';
            const isMonetised = isPaid || isSubsGated;
            return (
              <div key={ev.id} className="card p-3.5">
                <div
                  className="row mb-2 flex items-center justify-between"
                  style={{ gap: 8 }}
                >
                  <span
                    className="when"
                    style={{
                      color: 'rgb(var(--brand-ink))',
                      fontWeight: 600,
                      fontSize: 11.5,
                      letterSpacing: '0.02em',
                    }}
                  >
                    {w.line}
                  </span>
                  {isDraft && <StatusChip status="draft" />}
                  {isCancelled && <StatusChip status="cancel" />}
                  {isCompleted && <StatusChip status="done" />}
                  {!isDraft && !isCancelled && !isCompleted && <StatusChip status="pub" />}
                </div>

                <button
                  onClick={() => nav(`/events/${ev.id}/command`)}
                  className="t-title-md block text-start mb-2 w-full"
                >
                  {ev.title}
                </button>

                <div className="row flex flex-wrap items-center gap-3.5">
                  <span className="t-body-md" style={{ margin: 0 }}>
                    <b style={{ color: 'rgb(var(--on-bg))' }}>{ev.rsvpStats.going}</b> RSVPs
                  </span>
                  {ev.rsvpStats.waitlist > 0 && (
                    <span className="t-body-md" style={{ margin: 0 }}>
                      <b style={{ color: 'rgb(var(--on-bg))' }}>{ev.rsvpStats.waitlist}</b> waitlist
                    </span>
                  )}
                  <div className="flex-1" />
                  {/* Money-blindness: sub-admin sees "Paid" badge for any
                      monetised event (paid OR subscription-only), never the
                      ₪ amount and never a "Subs" pill that would leak the
                      subscription system. Admin sees the real ₪ amount. */}
                  {isSubAdmin ? (
                    isMonetised ? (
                      <PriceTag kind="paid" amount="Paid" />
                    ) : (
                      <PriceTag kind="free" />
                    )
                  ) : isPaid ? (
                    <PriceTag kind="paid" amount={fmtCents(ev.priceCents)} />
                  ) : (
                    <PriceTag kind="free" />
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <button
                    onClick={() => nav(`/admin/events/${ev.id}/edit`)}
                    className="chip"
                    style={{
                      background: 'rgb(var(--surface-2))',
                      color: 'rgb(var(--on-bg))',
                      borderColor: 'transparent',
                      height: 30,
                    }}
                  >
                    <Icon name="edit" size={14} />
                    Edit
                  </button>
                  {/* Pricing row action is admin-only — sub-admin doesn't see prices. */}
                  {isPaid && !isSubAdmin && (
                    <button
                      onClick={() => nav(`/admin/events/${ev.id}/pricing`)}
                      className="chip"
                      style={{
                        background: 'rgb(var(--surface-2))',
                        color: 'rgb(var(--on-bg))',
                        borderColor: 'transparent',
                        height: 30,
                      }}
                    >
                      <Icon name="payments" size={14} />
                      Pricing
                    </button>
                  )}
                  <button
                    onClick={() => nav(`/admin/events/${ev.id}/managers`)}
                    className="chip"
                    style={{
                      background: 'rgb(var(--surface-2))',
                      color: 'rgb(var(--on-bg))',
                      borderColor: 'transparent',
                      height: 30,
                    }}
                  >
                    <Icon name="manage_accounts" size={14} />
                    Managers
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Floating action button — design unit 52. */}
        <button
          onClick={() => nav('/admin/events/new')}
          className="fab"
          aria-label="New event"
        >
          <Icon name="add" size={20} />
          New event
        </button>
      </main>
    </Screen>
  );
}
