import { useNavigate, useParams } from 'react-router-dom';
import { AppBar, Screen } from '../../components/AppBar';
import { AppButton } from '../../components/AppButton';
import { Icon } from '../../components/Icon';
import { Pill } from '../../components/Pill';
import { Card } from '../../components/Card';
import { LoadingDots } from '../../components/LoadingDots';
import { useCommunity, useCommunityEvents, useJoinCommunity, useMyCommunities } from '../../lib/queries';
import { communityContext } from '../../lib/community-context';
import { EventCard as EventCardCmp } from '../../components/EventCard';
import { fmtCents, fmtEventWhen } from '../../lib/format';
import { t } from '../../i18n';
import { SuspendedCommunityScreen } from '../edge/SuspendedCommunityScreen';

export function CommunityDetailScreen() {
  const { cid } = useParams<{ cid: string }>();
  const nav = useNavigate();
  const { data: community, isLoading } = useCommunity(cid);
  const { data: events } = useCommunityEvents(cid, 'published');
  const { data: mine } = useMyCommunities();
  const join = useJoinCommunity();
  const setCurrent = communityContext((s) => s.setCurrent);

  const myMembership = mine?.find((m) => m.community.id === cid);
  const isMember = myMembership?.membership.status === 'active';

  if (isLoading || !community) {
    return (
      <Screen>
        <AppBar back />
        <div className="flex flex-1 items-center justify-center">
          <LoadingDots />
        </div>
      </Screen>
    );
  }

  if (community.status === 'suspended') {
    return <SuspendedCommunityScreen communityName={community.name} />;
  }

  function onJoin(): void {
    if (!cid) return;
    join.mutate(cid, {
      onSuccess: () => {
        setCurrent(cid);
        nav(`/c/${cid}/welcome`);
      },
    });
  }

  function enterCommunity(): void {
    setCurrent(cid!);
    nav('/home');
  }

  return (
    <Screen>
      <div
        className="imgph"
        style={{ height: 200, position: 'relative', borderRadius: '0 0 22px 22px' }}
      >
        <span className="lbl">cover</span>
        <div className="absolute inset-x-3 top-3">
          <button
            onClick={() => nav(-1)}
            className="ic-btn"
            style={{ background: 'rgba(0,0,0,0.3)', color: '#fff' }}
          >
            <Icon name="arrow_forward" />
          </button>
        </div>
      </div>
      <main className="flex-1 px-5 pt-5 content-md lg:px-8">
        <div className="flex items-start gap-3">
          <div
            className="flex h-16 w-16 items-center justify-center text-brand-on shadow-low"
            style={{ borderRadius: 14, background: 'rgb(var(--brand))', marginTop: -38, border: '4px solid rgb(var(--bg))' }}
          >
            <Icon name="diversity_3" size={28} />
          </div>
          <div className="flex-1">
            <h1 className="t-display-md mt-1">{community.name}</h1>
            <div className="mt-1 flex items-center gap-2">
              <span className="t-body-md" style={{ margin: 0 }}>
                {community.memberCount.toLocaleString(undefined)} {t.app.members}
              </span>
              {community.privacy === 'private' && <Pill tone="neutral">Private</Pill>}
              {community.privacy === 'application' && <Pill tone="warn">Application</Pill>}
            </div>
          </div>
        </div>

        {community.category && (
          <div className="mt-3">
            <Pill tone="neutral">
              <Icon name="category" size={13} />
              {community.category}
            </Pill>
          </div>
        )}

        {community.description && (
          <p className="t-body-lg mt-4">{community.description}</p>
        )}

        <section className="mt-5">
          <div className="section-header">
            <span className="sh-title">What to expect</span>
          </div>
          <div className="space-y-2">
            {[
              { icon: 'forum', label: 'Member discussions and announcements' },
              { icon: 'event_available', label: 'Events you can RSVP to' },
              { icon: 'rule', label: 'Clear community guidelines on join' },
            ].map((row) => (
              <div key={row.label} className="card flex items-center gap-3 p-3">
                <span
                  className="flex h-9 w-9 items-center justify-center text-brand"
                  style={{ borderRadius: 11, background: 'rgb(var(--brand-wash))' }}
                >
                  <Icon name={row.icon} size={18} />
                </span>
                <span className="t-body-md flex-1" style={{ margin: 0, fontSize: 13.5 }}>
                  {row.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-5">
          {!isMember ? (
            <AppButton onClick={onJoin} loading={join.isPending}>
              {community.privacy === 'public' ? t.community.join : t.community.requestJoin}
            </AppButton>
          ) : (
            <AppButton variant="secondary" onClick={enterCommunity}>
              Enter community
            </AppButton>
          )}
        </div>

        {events && events.length > 0 && (
          <section className="mt-7">
            <div className="section-header">
              <span className="sh-title">{t.events.upcoming}</span>
            </div>
            <div className="space-y-3">
              {events.slice(0, 5).map((ev) => {
                const w = fmtEventWhen(ev.startAt);
                return (
                  <EventCardCmp
                    key={ev.id}
                    title={ev.title}
                    when={w.line}
                    location={ev.location?.name}
                    priceKind={ev.priceCents > 0 ? 'paid' : 'free'}
                    priceAmount={ev.priceCents > 0 ? fmtCents(ev.priceCents) : undefined}
                    onClick={() => nav(`/events/${ev.id}`)}
                  />
                );
              })}
            </div>
          </section>
        )}
      </main>
    </Screen>
  );
}
