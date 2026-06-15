import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { AppBar } from '../../components/AppBar';
import { Avatar } from '../../components/Avatar';
import { Card } from '../../components/Card';
import { Icon } from '../../components/Icon';
import { AppButton } from '../../components/AppButton';
import {
  useMyCommunities,
  useMyManagedEvents,
  useMyRsvps,
  useMySubscriptions,
  useCommunityInitiatives,
} from '../../lib/queries';
import { communityContext } from '../../lib/community-context';
import { fmtEventWhen } from '../../lib/format';
import { t } from '../../i18n';

export function ProfileScreen() {
  const auth = useAuth();
  const nav = useNavigate();
  const ctx = communityContext();
  const { data: mine } = useMyCommunities();
  const { data: managed } = useMyManagedEvents();
  const { data: rsvps } = useMyRsvps();
  const { data: subs } = useMySubscriptions();
  const { data: initiatives } = useCommunityInitiatives(ctx.currentCommunityId ?? mine?.[0]?.community.id);

  const isAdmin = mine?.some(
    (m) => m.membership.role === 'admin' || m.membership.role === 'subadmin',
  );
  const isEventManager = (managed?.length ?? 0) > 0;
  const isSuper = auth.user?.globalRole === 'superadmin';

  const now = Date.now();
  // Upcoming RSVPs are the single most-clicked profile element across mobile
  // community apps — surface the next one front and center.
  const upcomingRsvps = (rsvps ?? [])
    .filter((r) => r.status === 'going' && new Date(r.event.startAt).getTime() >= now)
    .sort((a, b) => new Date(a.event.startAt).getTime() - new Date(b.event.startAt).getTime());
  const nextRsvp = upcomingRsvps[0];
  const activeSub = (subs ?? []).find(
    (s) => s.status === 'active' || s.status === 'trialing',
  );

  const rsvpCount = (rsvps ?? []).length;
  const communitiesCount = (mine ?? []).length;
  const myInitiativesCount = (initiatives ?? []).filter(
    (i) => i.author.id === auth.user?.id,
  ).length;

  const interests = auth.user?.interests ?? [];

  const MENU: Array<{ icon: string; label: string; to: string }> = [
    // Member quick-jumps mirror design Batch B · 35: My RSVPs, My initiatives,
    // My communities. Super admin has no community memberships → hide them.
    ...(isSuper
      ? []
      : [
          { icon: 'event_available', label: 'My RSVPs', to: '/me/rsvps' },
          { icon: 'lightbulb', label: 'My initiatives', to: '/initiatives' },
          { icon: 'groups', label: 'My communities', to: '/discover' },
          { icon: 'workspace_premium', label: 'My memberships', to: '/me/subscriptions' },
          { icon: 'notifications', label: 'Notifications', to: '/me/notifications' },
        ]),
    ...(isEventManager
      ? [{ icon: 'event', label: 'Events I manage', to: '/manage/events' }]
      : []),
    ...(isAdmin ? [{ icon: 'shield_person', label: 'Community admin', to: '/admin' }] : []),
    ...(isSuper ? [{ icon: 'workspace_premium', label: 'Super admin panel', to: '/super' }] : []),
  ];

  return (
    <>
      <AppBar
        title={t.home.tabProfile}
        trailing={
          <button
            onClick={() => nav('/profile/settings')}
            className="ic-btn"
            aria-label="Settings"
          >
            <Icon name="settings" />
          </button>
        }
      />
      <main className="px-5 pb-6 content-md lg:px-8">
        {/* Avatar + name */}
        <div className="flex flex-col items-center text-center" style={{ marginBottom: 14 }}>
          <Avatar name={auth.user?.name} size={80} />
          <div className="t-title-lg" style={{ margin: '12px 0 2px' }}>
            {auth.user?.name ?? '—'}
          </div>
          <div className="t-body-md" style={{ margin: 0 }} dir="ltr">
            {auth.user?.email}
          </div>
          {activeSub && (
            <span
              className="role-badge mt-2"
              style={{
                background: 'rgb(var(--brand-wash))',
                color: 'rgb(var(--brand-ink))',
                cursor: 'pointer',
              }}
              onClick={() => nav('/me/subscriptions')}
              role="button"
            >
              <Icon name="workspace_premium" size={13} />
              {activeSub.plan === 'annual' ? 'Annual' : 'Monthly'} member
            </span>
          )}
        </div>

        {/* Next-up RSVP — the #1 thing members visit Profile to confirm */}
        {!isSuper && nextRsvp && (
          <button
            onClick={() => nav(`/events/${nextRsvp.event.id}`)}
            className="card text-start w-full"
            style={{ padding: 14, marginBottom: 14 }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Icon
                name="event_available"
                size={16}
                style={{ color: 'rgb(var(--success))' }}
              />
              <span
                className="t-label-sm"
                style={{ margin: 0, color: 'rgb(var(--success))' }}
              >
                Next up — you're going
              </span>
              {upcomingRsvps.length > 1 && (
                <span
                  className="t-body-md"
                  style={{ margin: 0, marginInlineStart: 'auto', fontSize: 11 }}
                >
                  +{upcomingRsvps.length - 1} more
                </span>
              )}
            </div>
            <div className="t-title-md" style={{ fontSize: 15, marginBottom: 2 }}>
              {nextRsvp.event.title}
            </div>
            <div className="t-body-md" style={{ margin: 0, fontSize: 12 }}>
              {fmtEventWhen(nextRsvp.event.startAt).line}
              {nextRsvp.event.location?.name ? ` · ${nextRsvp.event.location.name}` : ''}
            </div>
          </button>
        )}

        {/* 3 stat cards */}
        {!isSuper && (
          <div className="flex gap-2.5" style={{ marginBottom: 18 }}>
            <StatTile value={rsvpCount} label="RSVPs" />
            <StatTile value={myInitiativesCount} label="Initiatives" />
            <StatTile value={communitiesCount} label="Communities" />
          </div>
        )}

        {/* Interests chips */}
        {interests.length > 0 && (
          <>
            <div className="t-label-sm" style={{ marginBottom: 10 }}>
              Interests
            </div>
            <div className="flex flex-wrap gap-2" style={{ marginBottom: 18 }}>
              {interests.slice(0, 8).map((i) => (
                <span
                  key={i}
                  className="chip"
                  style={{
                    height: 30,
                    background: 'rgb(var(--surface-2))',
                    borderColor: 'transparent',
                  }}
                >
                  {i}
                </span>
              ))}
            </div>
          </>
        )}

        {/* Menu list */}
        <Card className="p-1" style={{ padding: '4px 14px' }}>
          {MENU.map((m, idx) => (
            <button
              key={m.label}
              onClick={() => nav(m.to)}
              className="list-row w-full text-start"
              style={idx === MENU.length - 1 ? { borderBottom: 'none' } : undefined}
            >
              <Icon name={m.icon} className="text-muted" />
              <span className="flex-1 t-body-lg" style={{ fontSize: 14 }}>
                {m.label}
              </span>
              <Icon name="chevron_right" className="text-muted" />
            </button>
          ))}
        </Card>

        {/* Secondary actions */}
        <div className="mt-4 space-y-2.5">
          <AppButton variant="secondary" onClick={() => nav('/profile/edit')}>
            <Icon name="edit" size={18} />
            Edit profile
          </AppButton>
          <AppButton
            variant="ghost"
            onClick={() => {
              auth.logout();
              nav('/login', { replace: true });
            }}
          >
            <Icon name="logout" size={18} />
            Sign out
          </AppButton>
        </div>
      </main>
    </>
  );
}

function StatTile({ value, label }: { value: number; label: string }) {
  return (
    <Card className="flex-1 text-center" style={{ padding: 12 }}>
      <div className="t-title-lg font-display">{value}</div>
      <div className="t-body-md" style={{ margin: 0, fontSize: 11 }}>
        {label}
      </div>
    </Card>
  );
}
