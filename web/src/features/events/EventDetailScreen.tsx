import { useNavigate, useParams } from 'react-router-dom';
import { AppBar, Screen } from '../../components/AppBar';
import { AppButton } from '../../components/AppButton';
import { Icon } from '../../components/Icon';
import { Pill, StatusChip } from '../../components/Pill';
import { LoadingDots } from '../../components/LoadingDots';
import { useEvent, useMySubscriptions, useRsvp, useCancelRsvp } from '../../lib/queries';
import { fmtCents, fmtEventRange, fmtEventWhen } from '../../lib/format';
import { t } from '../../i18n';

export function EventDetailScreen() {
  const { eid } = useParams<{ eid: string }>();
  const nav = useNavigate();
  const { data: ev, isLoading } = useEvent(eid);
  const { data: subs } = useMySubscriptions();
  const rsvp = useRsvp();
  const cancel = useCancelRsvp();

  if (isLoading || !ev) {
    return (
      <Screen>
        <AppBar back />
        <div className="flex flex-1 items-center justify-center">
          <LoadingDots />
        </div>
      </Screen>
    );
  }

  const going = ev.myRsvp?.status === 'going';
  const waitlist = ev.myRsvp?.status === 'waitlist';
  const w = fmtEventWhen(ev.startAt);

  // Subscription benefits per PRD 09 §2.2: an active subscriber to this
  // event's community gets sub-included paid events for free.
  const hasActiveSub =
    subs?.some(
      (s) =>
        s.communityId === ev.communityId &&
        (s.status === 'active' || s.status === 'trialing'),
    ) ?? false;
  const subPerk = ev.subscriptionIncluded === true;
  const effectiveFree = ev.priceCents === 0 || (subPerk && hasActiveSub);
  const pending = rsvp.isPending || cancel.isPending;

  // The mutation flips ev.myRsvp via cache invalidation, but until the refetch
  // lands the button reads stale. Track an in-flight intent so the CTA flips
  // instantly — gives the same haptic-feel a native app has.
  const optimisticGoing = rsvp.isPending ? true : cancel.isPending ? false : going;
  const optimisticWaitlist = cancel.isPending ? false : waitlist;

  async function onRsvp(): Promise<void> {
    if (!eid) return;
    if (going || waitlist) {
      await cancel.mutateAsync(eid);
      return;
    }
    // If a subscriber gets this event for free, skip Stripe checkout.
    if (ev!.priceCents > 0 && !effectiveFree) {
      nav(`/events/${eid}/checkout`);
      return;
    }
    try {
      await rsvp.mutateAsync(eid);
      nav(`/events/${eid}/confirmed`);
    } catch (err) {
      // 402 → event full → waitlist. (paid path is handled above by priceCents > 0.)
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 402 || status === 409) {
        nav(`/events/${eid}/waitlist`);
      }
    }
  }

  // CTA copy reflects what the tap will *actually* do — pay, RSVP for free,
  // join the waitlist (capacity is hit), or cancel. Members glance at the
  // bottom bar; ambiguity is the most reported confusion in the design audit.
  const isFull = ev.capacity != null && (ev.rsvpStats?.remaining ?? 0) <= 0;
  const ctaLabel = optimisticGoing
    ? t.events.cancelRsvp
    : optimisticWaitlist
    ? 'Leave waitlist'
    : isFull
    ? t.events.joinWaitlist
    : ev.priceCents > 0 && !effectiveFree
    ? `${t.events.rsvpPaid} · ${fmtCents(ev.priceCents)}`
    : t.events.rsvp;

  return (
    <Screen>
      {/* Cover */}
      <div
        className="imgph"
        style={{
          position: 'absolute',
          inset: '0 0 auto',
          height: 288,
          borderRadius: 0,
          backgroundColor: '#2a2620',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(180deg, rgba(20,19,15,0.25), rgba(20,19,15,0.05) 40%, transparent)',
          }}
        />
      </div>
      <div className="relative z-10 flex items-center gap-2 px-4 py-3">
        <button
          onClick={() => nav(-1)}
          className="ic-btn"
          style={{ background: 'rgba(0,0,0,0.3)', color: '#fff' }}
        >
          <Icon name="arrow_back" />
        </button>
        <span className="flex-1" />
        <button className="ic-btn" style={{ background: 'rgba(0,0,0,0.3)', color: '#fff' }}>
          <Icon name="ios_share" />
        </button>
        <button className="ic-btn" style={{ background: 'rgba(0,0,0,0.3)', color: '#fff' }}>
          <Icon name="bookmark_border" />
        </button>
      </div>
      <div className="relative flex-1 overflow-y-auto">
        <div style={{ height: 150 }} />
        <div
          style={{
            background: 'rgb(var(--bg))',
            borderRadius: '22px 22px 0 0',
            padding: '22px 20px 110px',
            minHeight: 420,
          }}
        >
          <StatusChip status={ev.status === 'published' ? 'pub' : ev.status === 'cancelled' ? 'cancel' : ev.status === 'completed' ? 'done' : 'draft'} />
          <h1 className="t-display-md mb-4 mt-2">{ev.title}</h1>

          <div className="list-row" style={{ padding: '11px 0' }}>
            <span className="msr" style={{ color: 'rgb(var(--brand))' }}>
              calendar_today
            </span>
            <div>
              <div className="t-label-lg">{w.day}</div>
              <div className="t-body-md" style={{ margin: 0 }}>
                {fmtEventRange(ev.startAt, ev.endAt)}
              </div>
            </div>
          </div>

          {ev.location?.name && (
            <div className="list-row" style={{ padding: '11px 0' }}>
              <span className="msr" style={{ color: 'rgb(var(--brand))' }}>
                place
              </span>
              <div>
                <div className="t-label-lg">{ev.location.name}</div>
                {ev.location.address && (
                  <div className="t-body-md" style={{ margin: 0 }}>
                    {ev.location.address}
                  </div>
                )}
              </div>
            </div>
          )}

          {ev.description && (
            <>
              <div className="t-label-sm" style={{ margin: '16px 0 8px' }}>
                {t.events.aboutTitle}
              </div>
              <p className="t-body-lg" style={{ margin: 0 }}>
                {ev.description}
              </p>
            </>
          )}

          {ev.rsvpStats && (
            <div className="mt-5 flex gap-2">
              <Pill tone="ok">{t.app.nGoing(ev.rsvpStats.going)}</Pill>
              {ev.rsvpStats.waitlist > 0 && (
                <Pill tone="warn">Waitlist: {ev.rsvpStats.waitlist}</Pill>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sticky pay bar */}
      <div
        className="safe-bottom flex items-center gap-3.5 px-5 py-3"
        style={{
          background: 'rgb(var(--surface))',
          borderTop: '1px solid rgb(var(--border))',
          position: 'relative',
          zIndex: 20,
        }}
      >
        <div>
          <div className="t-body-md" style={{ margin: 0, fontSize: 11 }}>
            {t.events.price}
          </div>
          <div
            className="t-title-md"
            style={{
              color: effectiveFree ? 'rgb(var(--success))' : 'rgb(var(--on-bg))',
            }}
          >
            {effectiveFree && ev.priceCents > 0 ? (
              <>
                <span style={{ textDecoration: 'line-through', fontSize: 13, color: 'rgb(var(--muted))', marginInlineEnd: 8 }}>
                  {fmtCents(ev.priceCents)}
                </span>
                Included in your sub
              </>
            ) : (
              fmtCents(ev.priceCents)
            )}
          </div>
          {subPerk && !hasActiveSub && (
            <button
              onClick={() => nav(`/c/${ev.communityId}/subscribe`)}
              className="t-body-md"
              style={{ margin: 0, fontSize: 11, color: 'rgb(var(--brand-ink))', fontWeight: 600 }}
            >
              Free for subscribers · Join
            </button>
          )}
        </div>
        <AppButton
          block
          loading={pending}
          onClick={onRsvp}
          variant={optimisticGoing ? 'secondary' : 'primary'}
        >
          {optimisticGoing && !pending && <Icon name="check_circle" size={18} />}
          {ctaLabel}
        </AppButton>
      </div>
    </Screen>
  );
}
