import { useNavigate } from 'react-router-dom';
import { AppBar, Screen } from '../../components/AppBar';
import { AppButton } from '../../components/AppButton';
import { Icon } from '../../components/Icon';
import { useAuth } from '../../lib/auth';
import { communityContext } from '../../lib/community-context';
import { useMyCommunities } from '../../lib/queries';
import { pickActiveMembership, resolveRole } from '../../lib/role';

// Role-aware 403. A sub-admin who deep-linked into /admin/finances or
// /admin/subscriptions shouldn't be dumped onto /home (the consumer feed) —
// the admin dashboard is the right home base for them. The headline and
// copy also change so they understand this is the Community Admin tier
// (which they explicitly are NOT), not a generic "your account has no
// access" wall.
export function UnauthorizedScreen() {
  const nav = useNavigate();
  const auth = useAuth();
  const ctx = communityContext();
  const { data: mine } = useMyCommunities();
  const active = pickActiveMembership(mine, ctx.currentCommunityId);
  const role = resolveRole(auth.user, active);
  const isSubAdmin = role === 'subadmin';

  const headline = isSubAdmin ? 'Community Admin only' : "You don't have access";
  const body = isSubAdmin
    ? 'Finances, subscriptions, branding and platform settings live with the Community Admin. The day-to-day surfaces (members, events, moderation) are still in your Manage tab.'
    : "This area is for community admins. If you think that's a mistake, ask a community admin.";
  const cta = isSubAdmin ? 'Back to Manage' : 'Back to home';
  const ctaTarget = isSubAdmin ? '/admin' : '/home';

  return (
    <Screen>
      <AppBar back title="No access" />
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center content-sm lg:px-8">
        <span
          className="grid place-items-center mb-4"
          style={{
            width: 104,
            height: 104,
            borderRadius: '50%',
            background: 'rgb(var(--warning-wash))',
            color: 'rgb(var(--warning))',
          }}
        >
          <Icon name="lock" size={52} />
        </span>
        <h1 className="font-display text-3xl text-ink mb-2">{headline}</h1>
        <p className="t-body-md max-w-xs mb-6" style={{ margin: 0 }}>
          {body}
        </p>
      </main>
      <footer
        className="safe-bottom border-t px-4 py-3"
        style={{ background: 'rgb(var(--surface))', borderColor: 'rgb(var(--border))' }}
      >
        <AppButton variant="primary" onClick={() => nav(ctaTarget)}>
          {cta}
        </AppButton>
      </footer>
    </Screen>
  );
}
