import { useNavigate } from 'react-router-dom';
import { Screen } from '../../components/AppBar';
import { Card } from '../../components/Card';
import { Icon } from '../../components/Icon';
import { Pill } from '../../components/Pill';
import {
  useAdminOverview,
  useCommunity,
  useCommunityEvents,
  useFinances,
  useMyCommunities,
} from '../../lib/queries';
import { communityContext } from '../../lib/community-context';
import { fmtCents } from '../../lib/format';

// Sub-admin / admin landing page. Per PRD 05 §3 + design unit 47,
// sub-admin is money-blind: no Finances/Subscriptions/Branding/Settings/Roles
// tiles, no revenue KPI cards — its slot is replaced by a guard banner.
export function AdminDashboardScreen() {
  const nav = useNavigate();
  const ctx = communityContext();
  const { data: mine } = useMyCommunities();
  const cid = ctx.currentCommunityId ?? mine?.[0]?.community.id;
  const { data: community } = useCommunity(cid);
  const myRole = mine?.find((m) => m.community.id === cid)?.membership.role;
  const isSubAdmin = myRole === 'subadmin';
  const { data: fin } = useFinances(isSubAdmin ? undefined : cid);
  const { data: overview } = useAdminOverview(cid);
  const { data: events } = useCommunityEvents(cid);

  // Latest 2 upcoming events.
  const upcoming = (events ?? [])
    .filter((e) => e.status === 'published' && new Date(e.startAt).getTime() >= Date.now())
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
    .slice(0, 2);

  const sparklinePoints = buildSparkline(fin?.monthlySeries ?? []);
  const memberCount = overview?.kpis.members ?? community?.memberCount ?? 0;
  const monthRevenue = fin?.revenueThisMonth ?? 0;

  const monthDelta = (() => {
    const s = fin?.monthlySeries ?? [];
    if (s.length < 2) return 0;
    const last = s[s.length - 1].revenueCents;
    const prev = s[s.length - 2].revenueCents;
    if (prev === 0) return last > 0 ? 100 : 0;
    return Math.round(((last - prev) / prev) * 100);
  })();

  const tiles = [
    { icon: 'group', label: 'Members', to: '/admin/members', tone: 'brand' as const },
    ...(isSubAdmin
      ? []
      : [{ icon: 'admin_panel_settings', label: 'Roles', to: '/admin/members/roles' }]),
    {
      icon: 'how_to_reg',
      label: 'Pending requests',
      to: '/admin/members/pending',
      badge: overview?.kpis.pending,
    },
    { icon: 'event', label: 'Events', to: '/admin/events' },
    { icon: 'lightbulb', label: 'Initiatives', to: '/admin/initiatives/moderation' },
    { icon: 'flag', label: 'Moderation', to: '/admin/moderation', badge: overview?.kpis.flagged },
    { icon: 'insights', label: 'Analytics', to: '/admin/analytics' },
    ...(isSubAdmin
      ? []
      : [
          { icon: 'tune', label: 'Settings', to: '/admin/settings' },
          { icon: 'workspace_premium', label: 'Subscriptions', to: '/admin/subscriptions' },
        ]),
  ] as Array<{ icon: string; label: string; to: string; tone?: 'brand' | 'ok'; badge?: number }>;

  const pending = overview?.kpis.pending ?? 0;
  const flagged = overview?.kpis.flagged ?? 0;
  const notifBadge = pending + flagged;

  return (
    <Screen>
      {/* feed-head with community switcher pill + notifications */}
      <div className="feed-head safe-top">
        <button type="button" onClick={() => nav('/home')} className="switch-pill">
          <span className="lg">
            <Icon name={community?.logoUrl ? 'menu_book' : 'diversity_3'} />
          </span>
          <b style={{ fontSize: 14 }}>{community?.name ?? 'Community'}</b>
        </button>
        <span style={{ flex: 1 }} />
        <button
          className="ic-btn"
          onClick={() => nav('/me/notifications')}
          aria-label="Notifications"
        >
          <span className="nav-ico">
            <Icon name="notifications" />
            {notifBadge > 0 && <span className="badge-dot">{notifBadge}</span>}
          </span>
        </button>
      </div>

      <main className="flex-1 px-5 pb-6 overflow-y-auto">
        {/* Cross-role: when super admin suspends this community, the admin must
            see why every write action is rejected. Without this banner the
            admin gets opaque 403s on settings/invites/event-create. */}
        {community?.status === 'suspended' && (
          <Card
            className="mb-3 p-3 flex items-start gap-2.5"
            style={{
              background: 'rgb(var(--warning-wash))',
              borderColor: 'rgb(var(--warning))',
            }}
          >
            <Icon
              name="pause_circle"
              size={20}
              style={{ color: 'rgb(var(--warning))', marginTop: 2 }}
            />
            <div className="flex-1">
              <div className="t-label-lg">Community paused by platform</div>
              <p className="t-body-md" style={{ margin: '2px 0 0', fontSize: 12 }}>
                A super admin has temporarily suspended this community. Member
                actions, new events and most settings are blocked until it's
                restored. Reach out to platform support if this is unexpected.
              </p>
            </div>
          </Card>
        )}

        <div className="row mb-3.5 flex items-center gap-2.5" style={{ marginTop: 4 }}>
          <div className="t-display-md" style={{ fontSize: 24 }}>
            Overview
          </div>
          {isSubAdmin ? (
            <Pill tone="warn">
              <Icon name="shield" size={12} />
              Limited admin
            </Pill>
          ) : (
            <span
              className="role-badge"
              style={{
                background: 'rgb(var(--brand-wash))',
                color: 'rgb(var(--brand-ink))',
              }}
            >
              <Icon name="shield_person" size={13} />
              Admin
            </span>
          )}
        </div>

        {!isSubAdmin && (
          <>
            <button
              type="button"
              onClick={() => nav('/admin/finances')}
              className="revcard mb-3 w-full text-start"
              style={{ border: 0 }}
            >
              <div className="between">
                <div>
                  <div className="r-lbl">
                    <Icon name="payments" size={15} />
                    Revenue · this month
                  </div>
                  <div className="r-num">{fmtCents(monthRevenue)}</div>
                  <div className="r-delta">
                    {monthDelta >= 0 ? '▲' : '▼'} {Math.abs(monthDelta)}% vs last month
                  </div>
                </div>
                <svg
                  viewBox="0 0 96 60"
                  preserveAspectRatio="none"
                  style={{ width: 96, height: 60 }}
                >
                  <polyline
                    fill="none"
                    stroke="#7BE0A6"
                    strokeWidth="2.5"
                    points={sparklinePoints}
                  />
                </svg>
              </div>
            </button>

            <div className="grid2 grid grid-cols-2 gap-2.5 mb-4">
              <Card className="kpi">
                <div className="k-lbl">
                  <Icon name="savings" size={15} />
                  MRR
                </div>
                <div className="k-num">{fmtCents(fin?.mrrCents ?? 0)}</div>
                <div className="k-delta up">▲ {fin?.activeSubscriptions ?? 0} subs</div>
              </Card>
              <Card className="kpi">
                <div className="k-lbl">
                  <Icon name="group" size={15} />
                  Members
                </div>
                <div className="k-num">{memberCount.toLocaleString()}</div>
                <div className="k-delta up">▲ {pending} pending</div>
              </Card>
            </div>
          </>
        )}

        {/* Sub-admin: 4 KPI grid + RevenueGuardBanner (design unit 47). */}
        {isSubAdmin && (
          <>
            <div className="grid grid-cols-2 gap-2.5 mb-3">
              <Card className="kpi">
                <div className="k-lbl">
                  <Icon name="group" size={14} />
                  Members
                </div>
                <div className="k-num">{memberCount.toLocaleString()}</div>
              </Card>
              <Card className="kpi">
                <div className="k-lbl">
                  <Icon name="event_upcoming" size={14} />
                  Upcoming
                </div>
                <div className="k-num">{overview?.kpis.upcoming ?? 0}</div>
              </Card>
              <Card className="kpi">
                <div className="k-lbl">
                  <Icon name="how_to_reg" size={14} />
                  Pending
                </div>
                <div className="k-num">{pending}</div>
              </Card>
              <Card className="kpi">
                <div className="k-lbl">
                  <Icon name="flag" size={14} />
                  Flagged
                </div>
                <div className="k-num">{flagged}</div>
              </Card>
            </div>
            <div
              className="card row mb-4 flex items-start gap-3"
              style={{
                padding: 12,
                background: 'rgb(var(--surface-2))',
                border: 'none',
              }}
            >
              <Icon name="lock" size={18} className="text-warn" />
              <div className="grow t-body-md" style={{ margin: 0, fontSize: 12 }}>
                Revenue analytics are Community Admin only.
              </div>
            </div>
          </>
        )}

        <button
          onClick={() => nav('/admin/events/new')}
          className="card mb-4 flex items-center gap-3 w-full text-start"
          style={{
            padding: 14,
            background: 'rgb(var(--brand))',
            color: '#fff',
            border: 0,
          }}
        >
          <span
            className="grid place-items-center"
            style={{
              width: 38,
              height: 38,
              borderRadius: 11,
              background: 'rgba(255,255,255,0.2)',
            }}
          >
            <Icon name="add" size={22} />
          </span>
          <span className="flex-1">
            <span className="t-label-lg block" style={{ color: '#fff' }}>
              {isSubAdmin ? 'New free event' : 'New event'}
            </span>
            <span
              className="t-body-md block"
              style={{ color: 'rgba(255,255,255,0.85)', margin: 0, fontSize: 11 }}
            >
              {isSubAdmin ? 'Plan & publish' : 'Plan, price, publish'}
            </span>
          </span>
          <Icon name="arrow_forward" />
        </button>

        {upcoming.length > 0 && (
          <>
            <div className="section-header">
              <span className="sh-title" style={{ fontSize: 16 }}>
                Upcoming events
              </span>
              <button
                onClick={() => nav('/admin/events')}
                className="sh-link"
                style={{ border: 0, background: 'transparent', cursor: 'pointer' }}
              >
                All
              </button>
            </div>
            <div className="flex flex-col gap-2.5 mb-4">
              {upcoming.map((e) => {
                const isPaid = e.pricingType === 'paid';
                const isSub = e.pricingType === 'subscription_only' || e.pricingType === 'subscription';
                return (
                  <button
                    key={e.id}
                    onClick={() => nav(`/events/${e.id}/command`)}
                    className="event-card w-full text-start"
                    style={{ padding: 10 }}
                  >
                    <div
                      className="cover imgph"
                      style={{
                        backgroundImage: e.coverUrl ? `url(${e.coverUrl})` : undefined,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    >
                      {!e.coverUrl && <span className="lbl">cover</span>}
                    </div>
                    <div className="body">
                      <span className="when">{formatWhen(e.startAt)}</span>
                      <span className="ttl">{e.title}</span>
                      <div className="foot">
                        {isPaid ? (
                          <span className="price-tag pt-paid">
                            {isSubAdmin ? 'Paid' : fmtCents(e.priceCents)}
                          </span>
                        ) : isSub ? (
                          // Sub-admin must not see subscription affordances —
                          // collapse to a neutral "Paid" pill (no workspace_premium icon).
                          isSubAdmin ? (
                            <span className="price-tag pt-paid">Paid</span>
                          ) : (
                            <span className="price-tag pt-sub">
                              <Icon name="workspace_premium" size={11} />
                              Subs
                            </span>
                          )
                        ) : (
                          <span className="price-tag pt-free">
                            <Icon name="check" size={11} />
                            Free
                          </span>
                        )}
                        <span
                          className="t-body-md"
                          style={{ margin: 0, fontSize: 11 }}
                        >
                          {e.rsvpStats.going} going
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        <div className="section-header">
          <span className="sh-title" style={{ fontSize: 16 }}>
            Manage
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {tiles.map((t) => (
            <button key={t.label} onClick={() => nav(t.to)} className="tile text-start">
              <span
                className="t-ic"
                style={{
                  background:
                    t.tone === 'brand'
                      ? 'rgb(var(--brand-wash))'
                      : t.tone === 'ok'
                      ? 'rgb(var(--success-wash))'
                      : 'rgb(var(--surface-2))',
                  color:
                    t.tone === 'brand'
                      ? 'rgb(var(--brand-ink))'
                      : t.tone === 'ok'
                      ? 'rgb(var(--success))'
                      : 'rgb(var(--on-bg-2))',
                }}
              >
                <Icon name={t.icon} size={20} />
              </span>
              <span className="t-h">{t.label}</span>
              {t.badge != null && t.badge > 0 && (
                <span
                  className="absolute"
                  style={{
                    top: 10,
                    right: 10,
                    minWidth: 22,
                    height: 22,
                    padding: '0 6px',
                    borderRadius: 11,
                    background: 'rgb(var(--brand))',
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 600,
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </main>
    </Screen>
  );
}

function buildSparkline(series: Array<{ month: string; revenueCents: number }>): string {
  if (!series.length) return '0,48 16,40 32,42 48,28 64,30 80,16 96,8';
  const max = Math.max(1, ...series.map((s) => s.revenueCents));
  const w = 96;
  const h = 60;
  const step = series.length > 1 ? w / (series.length - 1) : w;
  return series
    .map((s, i) => {
      const x = i * step;
      const y = h - (s.revenueCents / max) * (h - 8) - 4;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  if (sameDay) return `TONIGHT · ${time}`;
  const dow = d.toLocaleDateString([], { weekday: 'short' }).toUpperCase();
  const mon = d.toLocaleDateString([], { month: 'short' }).toUpperCase();
  return `${dow} · ${mon} ${d.getDate()} · ${time}`;
}
