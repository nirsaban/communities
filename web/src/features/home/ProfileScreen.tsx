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
  useCommunityInitiatives,
} from '../../lib/queries';
import { communityContext } from '../../lib/community-context';
import { t } from '../../i18n';

export function ProfileScreen() {
  const auth = useAuth();
  const nav = useNavigate();
  const ctx = communityContext();
  const { data: mine } = useMyCommunities();
  const { data: managed } = useMyManagedEvents();
  const { data: rsvps } = useMyRsvps();
  const { data: initiatives } = useCommunityInitiatives(ctx.currentCommunityId ?? mine?.[0]?.community.id);

  const isAdmin = mine?.some(
    (m) => m.membership.role === 'admin' || m.membership.role === 'subadmin',
  );
  const isEventManager = (managed?.length ?? 0) > 0;
  const isSuper = auth.user?.globalRole === 'superadmin';

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
      <main className="px-5 pb-6">
        {/* Avatar + name */}
        <div className="flex flex-col items-center text-center" style={{ marginBottom: 18 }}>
          <Avatar name={auth.user?.name} size={80} />
          <div className="t-title-lg" style={{ margin: '12px 0 2px' }}>
            {auth.user?.name ?? '—'}
          </div>
          <div className="t-body-md" style={{ margin: 0 }} dir="ltr">
            {auth.user?.email}
          </div>
        </div>

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
