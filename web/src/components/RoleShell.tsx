import { Outlet } from 'react-router-dom';
import { BottomNav, SideNav } from './BottomNav';
import { Icon } from './Icon';
import { useAuth } from '../lib/auth';
import { communityContext } from '../lib/community-context';
import { useCommunity, useMyCommunities } from '../lib/queries';
import { pickActiveMembership, resolveRole } from '../lib/role';

// Same chrome as HomeShell, but used for top-level admin/super/EM routes that
// were previously bare. BottomNav inside is role-aware so each role sees its
// own tab set — including a path back to Profile (where Sign out lives).
//
// Super screens use the dark theme; we apply `.dark` to the whole shell so
// background, surfaces and text inherit dark-mode tokens edge-to-edge,
// including the BottomNav row.
//
// Cross-role: a single SuspendedCommunity banner lives here above the outlet
// so EVERY interactive screen (member, EM, sub-admin, admin) sees the same
// "paused" affordance — no more per-screen banners.
export function RoleShell() {
  const auth = useAuth();
  const ctx = communityContext();
  const { data: mine } = useMyCommunities();
  const active = pickActiveMembership(mine, ctx.currentCommunityId);
  const role = resolveRole(auth.user, active);
  const isSuper = role === 'super';
  // Super is a platform tier — they aren't bound to any specific community's
  // status. Skip the membership lookup so an unrelated suspended community
  // doesn't bleed into their dashboard.
  const cid = isSuper ? undefined : ctx.currentCommunityId ?? mine?.[0]?.community.id;
  const { data: community } = useCommunity(cid);
  const suspended = community?.status === 'suspended';

  return (
    <div
      className={`flex min-h-full bg-bg ${isSuper ? 'dark' : ''}`}
      style={{ minHeight: '100dvh' }}
    >
      <SideNav />
      <div className="flex min-h-full flex-1 flex-col">
        {suspended && (
          <SuspendedCommunityBanner name={community?.name ?? 'This community'} />
        )}
        <div className="flex-1 pb-2">
          <Outlet />
        </div>
        <BottomNav />
      </div>
    </div>
  );
}

function SuspendedCommunityBanner({ name }: { name: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '10px 14px',
        background: 'rgb(var(--warning-wash))',
        color: 'rgb(var(--warning))',
        borderBottom: '1px solid rgb(var(--warning))',
      }}
    >
      <Icon name="pause_circle" size={18} style={{ marginTop: 2 }} />
      <div style={{ flex: 1, color: 'rgb(var(--on-bg))' }}>
        <div className="t-label-lg">{name} is paused by the platform</div>
        <p className="t-body-md" style={{ margin: '2px 0 0', fontSize: 12 }}>
          Most actions (events, payments, member changes) are blocked until a
          super admin restores access. Memberships are safe.
        </p>
      </div>
    </div>
  );
}
