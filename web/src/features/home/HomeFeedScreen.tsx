import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { Icon } from '../../components/Icon';
import { Avatar } from '../../components/Avatar';
import { Shimmer, EventCardSkeleton } from '../../components/Shimmer';
import { EmptyState } from '../../components/EmptyState';
import { AppButton } from '../../components/AppButton';
import { PriceTag } from '../../components/Pill';
import {
  useCommunityEvents,
  useCommunityInitiatives,
  useCommunityPosts,
  useMyCommunities,
  useNotifications,
} from '../../lib/queries';
import { communityContext } from '../../lib/community-context';
import { fmtCents, fmtEventWhen } from '../../lib/format';
import { CommunitySwitcherSheet } from './CommunitySwitcherSheet';
import { SuspendedCommunityScreen } from '../edge/SuspendedCommunityScreen';
import { t } from '../../i18n';

export function HomeFeedScreen() {
  const auth = useAuth();
  const nav = useNavigate();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const { data: mine, isLoading: meLoading } = useMyCommunities();
  const ctx = communityContext();

  // Ensure currentCommunityId is set to first community if user has any.
  useEffect(() => {
    if (!ctx.currentCommunityId && mine && mine.length > 0) {
      ctx.setCurrent(mine[0].community.id);
    }
  }, [mine, ctx]);

  const currentCid = ctx.currentCommunityId ?? mine?.[0]?.community.id;
  const currentMembership = mine?.find((m) => m.community.id === currentCid);
  const { data: events, isLoading: eventsLoading } = useCommunityEvents(currentCid, 'published');
  const { data: posts } = useCommunityPosts(currentCid);
  const { data: initiatives } = useCommunityInitiatives(currentCid);
  const { data: notifs } = useNotifications();
  const unreadCount = (notifs ?? []).filter((n) => !n.read).length;

  const pinnedPost = (posts ?? []).find((p) => p.pinned);
  const recentPosts = (posts ?? []).filter((p) => p.id !== pinnedPost?.id).slice(0, 3);
  const activeInitiatives = (initiatives ?? [])
    .filter((i) => i.status === 'active')
    .slice(0, 3);

  if (meLoading) {
    return (
      <div className="px-5">
        <Header onSwitcher={() => setSwitcherOpen(true)} />
        <div className="mt-5 space-y-3">
          <Shimmer style={{ height: 36, width: 200 }} />
          <EventCardSkeleton />
        </div>
      </div>
    );
  }

  if (!mine || mine.length === 0) {
    return (
      <div className="relative px-5">
        <Header onSwitcher={() => setSwitcherOpen(true)} />
        <EmptyState
          icon="explore"
          title="Welcome!"
          body="You haven't joined any community yet. Discover new ones around your interests."
          action={
            <AppButton onClick={() => nav('/discover')}>{t.home.explore}</AppButton>
          }
        />
      </div>
    );
  }

  // Cross-role: super admin suspended this community. Members must see the
  // SuspendedCommunityScreen on /home too, not just /c/:cid — otherwise the
  // feed keeps loading stale posts/events while the community is paused.
  if (currentMembership?.community.status === 'suspended') {
    return <SuspendedCommunityScreen communityName={currentMembership.community.name} />;
  }

  // Pending application state — user requested to join an "application" privacy
  // community and hasn't been approved yet. Hide feed/events until approved.
  if (currentMembership?.membership.status === 'pending') {
    return (
      <div className="relative px-5">
        <Header
          communityName={currentMembership?.community.name}
          onSwitcher={() => setSwitcherOpen(true)}
        />
        <EmptyState
          icon="hourglass_top"
          title="Your request is under review"
          body="The community admin will be notified and approve you soon. We'll send a heads-up."
          action={
            <AppButton variant="secondary" onClick={() => nav('/discover')}>
              Discover more communities
            </AppButton>
          }
        />
        {switcherOpen && <CommunitySwitcherSheet onClose={() => setSwitcherOpen(false)} />}
      </div>
    );
  }

  return (
    <div className="relative">
      <Header
        communityName={currentMembership?.community.name}
        onSwitcher={() => setSwitcherOpen(true)}
        unreadCount={unreadCount}
        onBell={() => nav('/me/notifications')}
      />

      <main className="px-4">
        {/* Greeting */}
        <div style={{ margin: '2px 0 16px' }}>
          <div className="t-display-md">{t.home.greeting(auth.user?.name)}</div>
          <div className="t-body-md">
            {new Date().toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </div>
        </div>

        {/* Pinned admin announcement (from a pinned post if available) */}
        {pinnedPost && (
          <button
            onClick={() => nav(`/posts/${pinnedPost.id}`)}
            className="announce text-start w-full"
            style={{ marginBottom: 18 }}
          >
            <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
              <Icon name="push_pin" size={16} style={{ color: 'rgb(var(--brand-ink))' }} />
              <span className="t-label-sm" style={{ color: 'rgb(var(--brand-ink))', margin: 0 }}>
                {t.home.pinned}
              </span>
            </div>
            <div className="t-title-md" style={{ fontSize: 15, marginBottom: 3 }}>
              {pinnedPost.body.slice(0, 48)}
            </div>
            <div className="t-body-md" style={{ margin: 0 }}>
              {pinnedPost.body.length > 48
                ? pinnedPost.body.slice(48, 158) + (pinnedPost.body.length > 158 ? '…' : '')
                : 'Tap to read more'}
            </div>
          </button>
        )}

        {/* Happening soon — horizontal scroll of event tiles */}
        <div className="section-header">
          <span className="sh-title">{t.home.happeningSoon}</span>
          <button onClick={() => nav('/events')} className="sh-link">
            {t.app.seeAll}
          </button>
        </div>
        {eventsLoading && (
          <div className="hscroll" style={{ marginBottom: 20 }}>
            <Shimmer style={{ minWidth: 208, height: 200, borderRadius: 12 }} />
            <Shimmer style={{ minWidth: 208, height: 200, borderRadius: 12 }} />
          </div>
        )}
        {!eventsLoading && events && events.length === 0 && (
          <p className="t-body-md" style={{ marginBottom: 20 }}>
            No upcoming events in this community yet.
          </p>
        )}
        {events && events.length > 0 && (
          <div className="hscroll" style={{ marginBottom: 20 }}>
            {events.slice(0, 5).map((ev) => {
              const w = fmtEventWhen(ev.startAt);
              const isPaid = ev.priceCents > 0;
              return (
                <button
                  key={ev.id}
                  className="ev-tile card text-start"
                  style={{ padding: 0, overflow: 'hidden' }}
                  onClick={() => nav(`/events/${ev.id}`)}
                >
                  <div className="cover imgph">
                    <span className="lbl">cover</span>
                  </div>
                  <div style={{ padding: 11 }}>
                    <span
                      className="when"
                      style={{
                        color: 'rgb(var(--brand-ink))',
                        fontWeight: 600,
                        fontSize: 11.5,
                      }}
                    >
                      {w.line}
                    </span>
                    <div style={{ fontSize: 14, fontWeight: 700, margin: '4px 0' }}>
                      {ev.title}
                    </div>
                    <PriceTag
                      kind={isPaid ? 'paid' : 'free'}
                      amount={isPaid ? fmtCents(ev.priceCents) : undefined}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* From the community — recent posts */}
        {recentPosts.length > 0 && (
          <>
            <div className="section-header">
              <span className="sh-title">{t.home.fromCommunity}</span>
              <button onClick={() => nav('/posts')} className="sh-link">
                {t.app.seeAll}
              </button>
            </div>
            <div className="flex flex-col gap-3" style={{ marginBottom: 18 }}>
              {recentPosts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => nav(`/posts/${p.id}`)}
                  className="card post text-start"
                  style={{ padding: 14 }}
                >
                  <div className="flex items-center gap-2.5" style={{ marginBottom: 9 }}>
                    <Avatar name={p.author.name} size={36} />
                    <div className="flex-1">
                      <div className="t-label-lg">{p.author.name}</div>
                      <div className="t-body-md" style={{ margin: 0, fontSize: 12 }}>
                        {relativeTime(p.createdAt)}
                      </div>
                    </div>
                    <Icon name="more_horiz" size={20} className="text-muted" />
                  </div>
                  <p className="t-body-lg line-clamp-3" style={{ margin: 0 }}>
                    {p.body}
                  </p>
                  {(p.likeCount > 0 || p.commentCount > 0) && (
                    <div className="reacts">
                      <span className="r">
                        <Icon name="favorite" size={17} />
                        {p.likeCount}
                      </span>
                      <span className="r">
                        <Icon name="mode_comment" size={17} />
                        {p.commentCount}
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Active initiatives */}
        {activeInitiatives.length > 0 && (
          <>
            <div className="section-header">
              <span className="sh-title">Active initiatives</span>
              <button onClick={() => nav('/initiatives')} className="sh-link">
                {t.app.seeAll}
              </button>
            </div>
            <div className="flex flex-col gap-2.5" style={{ marginBottom: 18 }}>
              {activeInitiatives.map((i) => {
                const pct =
                  i.goal && i.goal > 0
                    ? Math.min(100, Math.round(((i.progress ?? 0) / i.goal) * 100))
                    : null;
                return (
                  <button
                    key={i.id}
                    onClick={() => nav(`/initiatives/${i.id}`)}
                    className="card p-3.5 w-full text-start"
                  >
                    <div className="t-label-lg">{i.title}</div>
                    {i.description && (
                      <p className="t-body-md line-clamp-1 mt-0.5" style={{ margin: 0 }}>
                        {i.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2" style={{ fontSize: 11 }}>
                      <span style={{ color: 'rgb(var(--muted))' }}>
                        <Icon name="favorite" size={12} /> {i.supporterCount} supporters
                      </span>
                      {pct != null && (
                        <>
                          <div
                            className="progress-track"
                            style={{ flex: 1 }}
                          >
                            <span style={{ width: `${pct}%` }} />
                          </div>
                          <span
                            style={{
                              minWidth: 32,
                              textAlign: 'end',
                              color: 'rgb(var(--brand-ink))',
                              fontWeight: 600,
                            }}
                          >
                            {pct}%
                          </span>
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </main>

      {switcherOpen && <CommunitySwitcherSheet onClose={() => setSwitcherOpen(false)} />}
    </div>
  );
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined);
}

function Header({
  communityName,
  onSwitcher,
  unreadCount = 0,
  onBell,
}: {
  communityName?: string;
  onSwitcher: () => void;
  unreadCount?: number;
  onBell?: () => void;
}) {
  return (
    <header className="feed-head safe-top">
      <button
        onClick={onSwitcher}
        className="switch-pill"
        type="button"
      >
        <span className="lg">
          <Icon name="diversity_3" />
        </span>
        <b style={{ fontSize: 14 }}>{communityName ?? 'Pick a community'}</b>
        <Icon name="unfold_more" size={18} className="text-muted" />
      </button>
      <span className="flex-1" />
      <button className="ic-btn" aria-label="Search">
        <Icon name="search" />
      </button>
      <button className="ic-btn" onClick={onBell} aria-label="Notifications">
        <span className="nav-ico">
          <Icon name="notifications" />
          {unreadCount > 0 && (
            <span className="badge-dot">{unreadCount > 99 ? '99+' : unreadCount}</span>
          )}
        </span>
      </button>
    </header>
  );
}
