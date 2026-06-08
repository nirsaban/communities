import { AppBar, Screen } from '../../components/AppBar';
import { Avatar } from '../../components/Avatar';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { Icon } from '../../components/Icon';
import { LoadingDots } from '../../components/LoadingDots';
import { communityContext } from '../../lib/community-context';
import {
  useAttendanceAnalytics,
  useGrowthAnalytics,
  useMostActive,
  useMyCommunities,
} from '../../lib/queries';

// Engagement-only analytics for sub-admins (PRD 05 §3 + design unit 57).
// Sub-admin sees a "Revenue analytics are Community Admin only" guard banner
// at the top; Community Admin sees a hint pointing to /admin/finances instead.
// No revenue/MRR widgets here — the money surface lives in FinancialDashboardScreen.
export function SubAdminAnalyticsScreen() {
  const ctx = communityContext();
  const { data: mine } = useMyCommunities();
  const cid = ctx.currentCommunityId ?? mine?.[0]?.community.id;
  const myRole = mine?.find((m) => m.community.id === cid)?.membership.role;
  const isSubAdmin = myRole === 'subadmin';
  const attendance = useAttendanceAnalytics(cid);
  const growth = useGrowthAnalytics(cid);
  const active = useMostActive(cid);

  const loading = attendance.isLoading || growth.isLoading || active.isLoading;

  // Build a 6-event bar chart from `perEvent` (most recent first → reverse so
  // the rightmost bar is the most recent).
  const bars = (attendance.data?.perEvent ?? []).slice(0, 6).reverse();
  const maxRsvp = Math.max(1, ...bars.map((e) => Math.max(e.rsvped, 1)));

  return (
    <Screen>
      <AppBar back title="Analytics" />
      <main className="flex-1 px-5 pb-6">
        {/* Sub-admin: hard guard banner. Admin: a soft pointer to /admin/finances
            so the screen isn't ambiguous about where the money lives. */}
        {isSubAdmin ? (
          <div
            className="card row mb-4 flex items-start gap-3"
            style={{
              padding: 11,
              background: 'rgb(var(--surface-2))',
              border: 'none',
            }}
          >
            <Icon name="lock" size={18} className="text-warn" />
            <div className="grow t-body-md" style={{ margin: 0, fontSize: 12 }}>
              Revenue analytics are Community Admin only.
            </div>
          </div>
        ) : (
          <div
            className="card row mb-4 flex items-start gap-3"
            style={{
              padding: 11,
              background: 'rgb(var(--brand-wash))',
              border: 'none',
            }}
          >
            <Icon name="payments" size={18} style={{ color: 'rgb(var(--brand-ink))' }} />
            <div
              className="grow t-body-md"
              style={{ margin: 0, fontSize: 12, color: 'rgb(var(--brand-ink))' }}
            >
              Revenue, MRR and refunds live in <b>Finances</b>.
            </div>
          </div>
        )}

        {loading && (
          <div className="flex flex-1 items-center justify-center py-12">
            <LoadingDots />
          </div>
        )}

        {!loading && (
          <>
            {/* Two top KPI tiles. */}
            <div className="grid grid-cols-2 gap-2.5 mb-4">
              <Card className="kpi">
                <div className="k-lbl">
                  <Icon name="check_circle" size={14} />
                  Attendance rate
                </div>
                <div className="k-num font-display">
                  {attendance.data?.attendanceRate ?? 0}%
                </div>
              </Card>
              <Card className="kpi">
                <div className="k-lbl">
                  <Icon name="group" size={14} />
                  Active members
                </div>
                <div className="k-num font-display">{growth.data?.total ?? 0}</div>
                {growth.data && growth.data.net90d !== 0 && (
                  <div className={`k-delta ${growth.data.net90d > 0 ? 'up' : 'down'}`}>
                    {growth.data.net90d > 0 ? '▲' : '▼'} {Math.abs(growth.data.net90d)} · 90d
                  </div>
                )}
              </Card>
            </div>

            {/* Weekly attendance bar chart card. */}
            <Card className="p-4 mb-4" style={{ padding: 16 }}>
              <div className="between mb-3">
                <span className="t-label-lg">Recent attendance</span>
                <span
                  className="t-body-md"
                  style={{ margin: 0, fontSize: 11, color: 'rgb(var(--muted))' }}
                >
                  last {bars.length} events
                </span>
              </div>
              {bars.length === 0 ? (
                <div
                  className="t-body-md"
                  style={{ margin: 0, color: 'rgb(var(--muted))' }}
                >
                  No completed events yet.
                </div>
              ) : (
                <>
                  <div className="bars">
                    {bars.map((e, i) => {
                      const h = Math.round((e.attended / maxRsvp) * 100);
                      const isCurrent = i === bars.length - 1;
                      return (
                        <div key={e.eventId} className={`bar ${isCurrent ? 'cur' : ''}`}>
                          <i style={{ height: `${Math.max(6, h)}%` }} />
                        </div>
                      );
                    })}
                  </div>
                  <div className="barlbls">
                    {bars.map((e, i) => (
                      <span key={`${e.eventId}-lbl`}>E{bars.length - i}</span>
                    ))}
                  </div>
                </>
              )}
            </Card>

            {/* Most active leaderboard. */}
            <div className="section-header" style={{ marginBottom: 8 }}>
              <span className="sh-title" style={{ fontSize: 16 }}>
                Most active
              </span>
            </div>
            {active.data && active.data.length === 0 && (
              <EmptyState icon="leaderboard" title="No data yet" />
            )}
            <div className="flex flex-col mb-5">
              {active.data?.slice(0, 10).map((m) => (
                <div
                  key={m.userId}
                  className="list-row flex items-center gap-3 text-start"
                >
                  <span
                    className="t-label-lg"
                    style={{
                      width: 18,
                      color:
                        m.rank === 1
                          ? 'rgb(var(--brand-ink))'
                          : 'rgb(var(--muted))',
                    }}
                  >
                    {m.rank}
                  </span>
                  <Avatar name={m.name} src={m.photoUrl ?? undefined} size={32} />
                  <div className="flex-1 min-w-0">
                    <div className="t-label-lg truncate">{m.name}</div>
                    <div
                      className="t-body-md"
                      style={{ margin: 0, fontSize: 11, color: 'rgb(var(--muted))' }}
                    >
                      {m.attended} attended · {m.rsvped} RSVPs
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </Screen>
  );
}
