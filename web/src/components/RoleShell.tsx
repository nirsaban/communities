import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { useAuth } from '../lib/auth';
import { communityContext } from '../lib/community-context';
import { useMyCommunities } from '../lib/queries';
import { pickActiveMembership, resolveRole } from '../lib/role';

// Same chrome as HomeShell, but used for top-level admin/super/EM routes that
// were previously bare. BottomNav inside is role-aware so each role sees its
// own tab set — including a path back to Profile (where Sign out lives).
//
// Super screens use the dark theme; we apply `.dark` to the whole shell so
// background, surfaces and text inherit dark-mode tokens edge-to-edge,
// including the BottomNav row.
export function RoleShell() {
  const auth = useAuth();
  const ctx = communityContext();
  const { data: mine } = useMyCommunities();
  const active = pickActiveMembership(mine, ctx.currentCommunityId);
  const role = resolveRole(auth.user, active);
  const isSuper = role === 'super';

  return (
    <div
      className={`flex min-h-full flex-col bg-bg ${isSuper ? 'dark' : ''}`}
      style={{ minHeight: '100dvh' }}
    >
      <div className="flex-1 pb-2">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
}
