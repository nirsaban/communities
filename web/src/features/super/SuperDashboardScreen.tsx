import { useId } from 'react';
import { Card } from '../../components/Card';
import { Icon } from '../../components/Icon';
import { LoadingDots } from '../../components/LoadingDots';
import { Screen } from '../../components/AppBar';
import { fmtCents } from '../../lib/format';
import { useSuperAudit, useSuperStats } from '../../lib/queries';

// Friendly labels for the cross-tenant activity feed. Falls back to the raw
// audit-log action key when an entry isn't mapped yet.
const ACTION_LABEL: Record<string, string> = {
  'auth.login': 'Signed in',
  'auth.register': 'Signed up',
  'auth.verifyEmail': 'Verified email',
  'community.create': 'Community created',
  'community.update': 'Community updated',
  'community.suspend': 'Community suspended',
  'community.restore': 'Community restored',
  'community.delete': 'Community deleted',
  'user.disable': 'User disabled',
  'user.enable': 'User enabled',
  'user.promote.super': 'Promoted to super admin',
  'event.create': 'Event created',
  'event.broadcast': 'Broadcast sent',
  'platform.settings.update': 'Platform settings updated',
};

// Pick an icon + wash colour by action family — drives the round badge on each row.
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

// Sparkline area chart for active-users-over-time — mirrors the SVG shape in
// Batch E unit #72. Normalises the series to the 96px viewport.
function ActiveUsersArea({ series }: { series: Array<{ date: string; active: number }> }) {
  const gradId = useId().replace(/:/g, '');
  if (series.length < 2) {
    return (
      <div
        className="t-body-md grid place-items-center"
        style={{ height: 96, margin: 0, color: 'rgb(var(--muted))' }}
      >
        Not enough data yet
      </div>
    );
  }
  const max = Math.max(...series.map((s) => s.active), 1);
  const w = 300;
  const h = 96;
  const step = w / (series.length - 1);
  const points = series
    .map((s, i) => `${(i * step).toFixed(1)},${(h - (s.active / max) * (h - 12) - 4).toFixed(1)}`)
    .join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: 96, display: 'block' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgb(var(--brand))" stopOpacity="0.25" />
          <stop offset="1" stopColor="rgb(var(--brand))" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon fill={`url(#${gradId})`} points={`${points} ${w},${h} 0,${h}`} />
      <polyline fill="none" stroke="rgb(var(--brand))" strokeWidth="2.5" points={points} />
    </svg>
  );
}

export function SuperDashboardScreen() {
  const { data, isLoading } = useSuperStats();
  const { data: audit } = useSuperAudit(8);

  const kpis = data?.kpis;
  // DAU/MAU stickiness: take a quick proxy as today's actives / month actives.
  const activeUsersSeries = data?.activeUsersSeries ?? [];
  const todayActive = activeUsersSeries.length ? activeUsersSeries[activeUsersSeries.length - 1].active : 0;
  const stickiness = kpis?.activeUsersMtd ? Math.round((todayActive / Math.max(kpis.activeUsersMtd, 1)) * 100) : 0;

  return (
    <Screen>
      {/* Custom feed-head per design: logo + Commons + role badge + notifications */}
      <header
        className="safe-top sticky top-0 z-20 flex items-center gap-2 px-4 py-2"
        style={{ background: 'rgb(var(--bg) / 0.85)', backdropFilter: 'blur(8px)' }}
      >
        <span
          className="grid place-items-center"
          style={{ width: 28, height: 28, borderRadius: 8, background: 'rgb(var(--brand))' }}
        >
          <Icon name="verified" size={18} />
        </span>
        <b style={{ fontSize: 15 }}>Commons</b>
        <span className="role-badge rb-super" style={{ marginInlineStart: 4 }}>
          <span className="msr">verified_user</span>
          Platform
        </span>
        <span className="flex-1" />
        <button className="ic-btn" aria-label="Notifications">
          <Icon name="notifications" />
        </button>
      </header>

      <main className="flex-1 px-5 pb-6">
        {isLoading && (
          <div className="flex flex-1 items-center justify-center py-12">
            <LoadingDots />
          </div>
        )}

        {kpis && (
          <>
            <div className="t-display-md" style={{ fontSize: 24, margin: '4px 0 14px' }}>
              Platform health
            </div>

            <div className="grid grid-cols-2 gap-2.5" style={{ marginBottom: 11 }}>
              <Card className="kpi">
                <div className="k-lbl">
                  <span className="msr" style={{ fontSize: 15 }}>hub</span>
                  Communities
                </div>
                <div className="k-num">{kpis.communities}</div>
                <div className="k-delta up">▲ {kpis.communities}</div>
              </Card>
              <Card className="kpi">
                <div className="k-lbl">
                  <span className="msr" style={{ fontSize: 15 }}>group</span>
                  Users
                </div>
                <div className="k-num">{kpis.users.toLocaleString()}</div>
                <div className="k-delta up">▲ active</div>
              </Card>
              <Card className="kpi">
                <div className="k-lbl">
                  <span className="msr" style={{ fontSize: 15 }}>payments</span>
                  Platform MRR
                </div>
                <div className="k-num">{fmtCents(kpis.mrrCents)}</div>
                <div className="k-delta up">▲ {kpis.activeSubs} active</div>
              </Card>
              <Card className="kpi">
                <div className="k-lbl">
                  <span className="msr" style={{ fontSize: 15 }}>bolt</span>
                  DAU / MAU
                </div>
                <div className="k-num">{stickiness}%</div>
                <div className="k-delta" style={{ color: 'rgb(var(--muted))' }}>stickiness</div>
              </Card>
            </div>

            <Card className="p-4" style={{ marginBottom: 16 }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
                <span className="t-label-lg">Active users · 14 days</span>
              </div>
              <ActiveUsersArea series={activeUsersSeries.slice(-14)} />
            </Card>

            <div className="section-header">
              <span className="sh-title" style={{ fontSize: 16 }}>Activity</span>
            </div>

            <div className="flex flex-col">
              {(audit ?? []).slice(0, 8).map((e) => {
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
                        {timeAgo(e.createdAt)}
                      </div>
                    </div>
                  </div>
                );
              })}
              {(!audit || audit.length === 0) && (
                <div className="t-body-md p-4 text-center" style={{ margin: 0 }}>
                  No activity yet
                </div>
              )}
            </div>
          </>
        )}
      </main>

    </Screen>
  );
}
