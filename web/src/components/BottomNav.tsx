import { NavLink } from 'react-router-dom';
import { t } from '../i18n';
import { Icon } from './Icon';
import { useAuth } from '../lib/auth';
import { communityContext } from '../lib/community-context';
import { useMyCommunities, useMyManagedEvents, useNotifications } from '../lib/queries';
import { pickActiveMembership, resolveRole } from '../lib/role';

type Tab = { to: string; label: string; icon: string };

// Design Batch B (screens 19–39): Home · Events · Initiatives · Inbox · Profile.
const MEMBER_TABS: Tab[] = [
  { to: '/home', label: t.home.tabHome, icon: 'home' },
  { to: '/events', label: t.home.tabEvents, icon: 'calendar_month' },
  { to: '/initiatives', label: t.home.tabInitiatives, icon: 'lightbulb' },
  { to: '/me/notifications', label: t.home.tabInbox, icon: 'forum' },
  { to: '/profile', label: t.home.tabProfile, icon: 'person' },
];

// Admin / Sub-admin chrome — landing on /admin, drill into members, events, finances.
// Profile is the universal Sign-out exit.
const ADMIN_TABS: Tab[] = [
  { to: '/admin', label: 'Manage', icon: 'shield_person' },
  { to: '/admin/members', label: 'Members', icon: 'group' },
  { to: '/admin/events', label: 'Events', icon: 'event' },
  { to: '/admin/analytics', label: 'Insights', icon: 'insights' },
  { to: '/profile', label: t.home.tabProfile, icon: 'person' },
];

// Event Manager — Managing first; member surface preserved (PRD 06 §5).
const EM_TABS: Tab[] = [
  { to: '/manage/events', label: 'Managing', icon: 'event' },
  { to: '/home', label: t.home.tabHome, icon: 'home' },
  { to: '/events', label: t.home.tabEvents, icon: 'calendar_month' },
  { to: '/me/notifications', label: t.home.tabInbox, icon: 'forum' },
  { to: '/profile', label: t.home.tabProfile, icon: 'person' },
];

// Super — platform shell. Audit lives under Settings now; Profile reaches Sign out.
const SUPER_TABS: Tab[] = [
  { to: '/super', label: 'Dashboard', icon: 'space_dashboard' },
  { to: '/super/communities', label: 'Communities', icon: 'hub' },
  { to: '/super/users', label: 'Users', icon: 'group' },
  { to: '/super/settings', label: 'Settings', icon: 'settings' },
  { to: '/profile', label: t.home.tabProfile, icon: 'person' },
];

export function BottomNav() {
  const auth = useAuth();
  const ctx = communityContext();
  const { data: mine } = useMyCommunities();
  const { data: managed } = useMyManagedEvents();
  const { data: notifs } = useNotifications();
  const active = pickActiveMembership(mine, ctx.currentCommunityId);
  const role = resolveRole(auth.user, active);
  const hasManagedEvent = (managed?.length ?? 0) > 0;

  const items =
    role === 'super'
      ? SUPER_TABS
      : role === 'admin' || role === 'subadmin'
      ? ADMIN_TABS
      : hasManagedEvent
      ? EM_TABS
      : MEMBER_TABS;

  const unread = (notifs ?? []).filter((n) => !n.read).length;

  return (
    // Hidden at ≥1024 — the SideNav owns the role-aware nav on desktop.
    <nav className="safe-bottom sticky bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur lg:hidden">
      <ul
        className="grid h-16"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((it) => {
          const showBadge = it.to === '/me/notifications' && unread > 0;
          return (
            <li key={it.to} className="contents">
              <NavLink
                to={it.to}
                end={it.to === '/admin' || it.to === '/super' || it.to === '/home'}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-0.5 text-[11px] transition-colors ${
                    isActive ? 'text-brand' : 'text-muted hover:text-ink'
                  }`
                }
              >
                {() => (
                  <>
                    {showBadge ? (
                      <span className="nav-ico">
                        <Icon name={it.icon} size={24} />
                        <span className="badge-dot">{unread > 99 ? '99+' : unread}</span>
                      </span>
                    ) : (
                      <Icon name={it.icon} size={24} />
                    )}
                    <span className="font-medium">{it.label}</span>
                  </>
                )}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// Desktop sidebar — mirrors BottomNav's role-aware tab list but renders as a
// fixed left rail at ≥1024. Mounted by HomeShell + RoleShell so both authed
// shells pick it up. Hidden below 1024 — BottomNav is still the mobile nav.
export function SideNav() {
  const auth = useAuth();
  const ctx = communityContext();
  const { data: mine } = useMyCommunities();
  const { data: managed } = useMyManagedEvents();
  const { data: notifs } = useNotifications();
  const active = pickActiveMembership(mine, ctx.currentCommunityId);
  const role = resolveRole(auth.user, active);
  const hasManagedEvent = (managed?.length ?? 0) > 0;

  const items =
    role === 'super'
      ? SUPER_TABS
      : role === 'admin' || role === 'subadmin'
        ? ADMIN_TABS
        : hasManagedEvent
          ? EM_TABS
          : MEMBER_TABS;
  const unread = (notifs ?? []).filter((n) => !n.read).length;
  const activeName =
    active?.community.name ?? (role === 'super' ? 'Platform' : 'Communities');

  return (
    <aside
      className="hidden lg:flex sticky top-0 self-start flex-col"
      style={{
        width: 'var(--side-nav-width)',
        height: '100vh',
        borderInlineEnd: '1px solid rgb(var(--border))',
        background: 'rgb(var(--surface))',
        padding: '18px 12px',
        gap: 4,
        flexShrink: 0,
      }}
    >
      <div className="px-3 pb-3">
        <div className="t-label-sm" style={{ fontSize: 10, letterSpacing: 0.8 }}>
          {role === 'super'
            ? 'PLATFORM'
            : role === 'admin' || role === 'subadmin'
              ? 'COMMUNITY'
              : 'YOU’RE IN'}
        </div>
        <div className="t-title-md truncate" style={{ fontSize: 15, marginTop: 2 }}>
          {activeName}
        </div>
      </div>
      <ul className="flex flex-col gap-1">
        {items.map((it) => {
          const showBadge = it.to === '/me/notifications' && unread > 0;
          return (
            <li key={it.to}>
              <NavLink
                to={it.to}
                end={it.to === '/admin' || it.to === '/super' || it.to === '/home'}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                    isActive
                      ? 'bg-brand-wash text-brand-ink font-semibold'
                      : 'text-muted hover:text-ink hover:bg-surface2'
                  }`
                }
              >
                {() => (
                  <>
                    <Icon name={it.icon} size={20} />
                    <span className="flex-1 truncate">{it.label}</span>
                    {showBadge && (
                      <span
                        style={{
                          minWidth: 18,
                          height: 18,
                          padding: '0 5px',
                          borderRadius: 999,
                          background: 'rgb(var(--brand))',
                          color: '#fff',
                          fontSize: 10,
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {unread > 99 ? '99+' : unread}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
