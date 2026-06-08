// Role-aware landing logic. Per PRD 02 §3.3 each role has its own workplace:
// super → /super, admin/subadmin → /admin, eventManager → /manage/events, member → /home.

import { api } from './api';
import type { User } from './auth';
import type { MembershipRole, MyCommunity } from './queries';

export type ResolvedRole = 'super' | 'admin' | 'subadmin' | 'eventManager' | 'member' | 'none';

export function pickActiveMembership(
  mine: MyCommunity[] | undefined,
  currentCommunityId: string | null,
): MyCommunity | undefined {
  if (!mine || mine.length === 0) return undefined;
  const byCtx = currentCommunityId
    ? mine.find((m) => m.community.id === currentCommunityId && m.membership.status === 'active')
    : undefined;
  if (byCtx) return byCtx;
  return mine.find((m) => m.membership.status === 'active') ?? mine[0];
}

export function resolveRole(user: User | null, active: MyCommunity | undefined): ResolvedRole {
  if (!user) return 'none';
  if (user.globalRole === 'superadmin') return 'super';
  if (!active) return 'none';
  const role = active.membership.role;
  if (role === 'admin' || role === 'subadmin' || role === 'eventManager' || role === 'member') {
    return role;
  }
  return 'member';
}

export function landingPathForRole(resolved: ResolvedRole): string {
  switch (resolved) {
    case 'super':
      return '/super';
    case 'admin':
    case 'subadmin':
      return '/admin';
    case 'eventManager':
      return '/manage/events';
    case 'member':
      return '/home';
    case 'none':
      return '/home';
  }
}

// Called from LoginScreen / SplashScreen — fetches both /me/communities and
// /me/managed-events so a member assigned to manage one event lands on
// /manage/events even though their Membership.role is still 'member'
// (per PRD 06 §4: per-event grant via Event.managers[]).
export async function landingPathAfterAuth(user: User): Promise<string> {
  if (!user?.name) return '/onboard/profile';
  if (user.globalRole === 'superadmin') return '/super';
  try {
    const [cRes, eRes] = await Promise.all([
      api.get('/me/communities'),
      api.get('/me/managed-events?limit=1'),
    ]);
    const mine = (cRes.data?.data ?? []) as MyCommunity[];
    const active = pickActiveMembership(mine, null);
    const role = resolveRole(user, active);
    if (role === 'admin' || role === 'subadmin') {
      // PRD 04 §8: first-login admin lands in the wizard until completed.
      // Sub-admin doesn't run the wizard, but if it's incomplete the admin
      // hasn't finished setup — fall through to the dashboard anyway.
      const wizardDone = active?.community.onboarding?.wizardCompletedAt;
      if (role === 'admin' && !wizardDone) return '/admin/wizard';
      return '/admin';
    }
    const managed = (eRes.data?.data ?? []) as unknown[];
    if (managed.length > 0) return '/manage/events';
    return landingPathForRole(role);
  } catch {
    return '/home';
  }
}
