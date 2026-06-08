import { AppBar, Screen } from '../../components/AppBar';
import { EmptyState } from '../../components/EmptyState';
import { Icon } from '../../components/Icon';
import { LoadingDots } from '../../components/LoadingDots';
import { useSuperAudit } from '../../lib/queries';

// Friendly labels for the cross-tenant activity feed.
const ACTION_LABEL: Record<string, string> = {
  'auth.login': 'Signed in',
  'auth.register': 'Signed up',
  'auth.verifyEmail': 'Verified email',
  'auth.logout': 'Signed out',
  'community.create': 'Created community',
  'community.update': 'Updated community',
  'community.suspend': 'Suspended community',
  'community.restore': 'Restored community',
  'community.delete': 'Deleted community',
  'user.disable': 'Disabled user',
  'user.enable': 'Enabled user',
  'user.promote.super': 'Promoted to super admin',
  'user.force_password_reset': 'Forced password reset',
  'event.create': 'Created event',
  'event.broadcast': 'Sent broadcast',
  'platform.settings.update': 'Updated platform settings',
};

function actionStyle(action: string): { icon: string; bg: string; fg: string } {
  if (action.startsWith('community.create')) {
    return { icon: 'add_business', bg: 'rgb(var(--success-wash))', fg: 'rgb(var(--success))' };
  }
  if (action.startsWith('community.suspend') || action.startsWith('community.delete')) {
    return { icon: 'report', bg: 'rgb(var(--error-wash))', fg: 'rgb(var(--error))' };
  }
  if (action.startsWith('community.')) {
    return { icon: 'hub', bg: 'rgb(var(--brand-wash))', fg: 'rgb(var(--brand))' };
  }
  if (action.startsWith('user.disable')) {
    return { icon: 'block', bg: 'rgb(var(--error-wash))', fg: 'rgb(var(--error))' };
  }
  if (action.startsWith('user.')) {
    return { icon: 'person', bg: 'rgb(var(--brand-wash))', fg: 'rgb(var(--brand))' };
  }
  if (action.startsWith('platform.')) {
    return { icon: 'tune', bg: 'rgb(var(--surface-2))', fg: 'rgb(var(--on-bg-2))' };
  }
  if (action.startsWith('auth.')) {
    return { icon: 'login', bg: 'rgb(var(--surface-2))', fg: 'rgb(var(--on-bg-2))' };
  }
  return { icon: 'bolt', bg: 'rgb(var(--surface-2))', fg: 'rgb(var(--on-bg-2))' };
}

function timeAgo(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const sec = Math.max(1, Math.floor((now - then) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

export function SuperAuditScreen() {
  const { data, isLoading } = useSuperAudit(100);

  return (
    <Screen className="dark">
      <AppBar back title="Audit log" />
      <main className="flex-1 px-5 pb-6">
        {isLoading && (
          <div className="flex flex-1 items-center justify-center py-12">
            <LoadingDots />
          </div>
        )}

        {!isLoading && (!data || data.length === 0) && (
          <EmptyState
            icon="receipt_long"
            title="No activity yet"
            body="Actions will show up here as they happen."
          />
        )}

        <div className="flex flex-col">
          {(data ?? []).map((e) => {
            const s = actionStyle(e.action);
            return (
              <div key={e.id} className="notif">
                <span className="ic" style={{ background: s.bg, color: s.fg }}>
                  <span className="msr">{s.icon}</span>
                </span>
                <div className="flex-1 min-w-0">
                  <div className="t-body-lg" style={{ fontSize: 14 }}>
                    <b>{e.actor?.name || 'System'}</b>
                    {' · '}
                    {ACTION_LABEL[e.action] ?? e.action}
                  </div>
                  <div className="t-body-md" style={{ margin: '2px 0 0', fontSize: 11 }}>
                    {e.actor?.email ? `${e.actor.email} · ` : ''}
                    {timeAgo(e.createdAt)}
                  </div>
                </div>
                <Icon name="chevron_right" className="text-muted" />
              </div>
            );
          })}
        </div>
      </main>
    </Screen>
  );
}
