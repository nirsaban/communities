import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar, Screen } from '../../components/AppBar';
import { AppButton } from '../../components/AppButton';
import { Card } from '../../components/Card';
import { Icon } from '../../components/Icon';
import { LoadingDots } from '../../components/LoadingDots';
import { Pill } from '../../components/Pill';
import { fmtCents } from '../../lib/format';
import { communityContext } from '../../lib/community-context';
import { useFinances, useMyCommunities } from '../../lib/queries';

type Range = 'month' | 'quarter' | 'year';

const RANGES: Array<{ id: Range; label: string }> = [
  { id: 'month', label: 'Month' },
  { id: 'quarter', label: 'Quarter' },
  { id: 'year', label: 'Year' },
];

export function FinancialDashboardScreen() {
  const nav = useNavigate();
  const ctx = communityContext();
  const { data: mine } = useMyCommunities();
  const cid = ctx.currentCommunityId ?? mine?.[0]?.community.id;
  const { data, isLoading } = useFinances(cid);
  const [range, setRange] = useState<Range>('month');

  // Pick the headline gross figure from range.
  const gross = useMemo(() => {
    if (!data) return 0;
    if (range === 'month') return data.revenueThisMonth;
    if (range === 'quarter') {
      // Last 3 months from monthlySeries.
      const s = data.monthlySeries ?? [];
      return s.slice(-3).reduce((sum, m) => sum + m.revenueCents, 0);
    }
    return data.totalRevenueCents;
  }, [data, range]);

  // Compute previous-period delta from monthlySeries.
  const delta = useMemo(() => {
    if (!data) return 0;
    const s = data.monthlySeries ?? [];
    if (range === 'month') {
      if (s.length < 2) return 0;
      const last = s[s.length - 1].revenueCents;
      const prev = s[s.length - 2].revenueCents;
      if (prev === 0) return last > 0 ? 100 : 0;
      return Math.round(((last - prev) / prev) * 100);
    }
    if (range === 'quarter') {
      const last3 = s.slice(-3).reduce((sum, m) => sum + m.revenueCents, 0);
      const prev3 = s.slice(-6, -3).reduce((sum, m) => sum + m.revenueCents, 0);
      if (prev3 === 0) return last3 > 0 ? 100 : 0;
      return Math.round(((last3 - prev3) / prev3) * 100);
    }
    return 0;
  }, [data, range]);

  if (isLoading || !data) {
    return (
      <Screen>
        <AppBar back title="Finances" />
        <div className="flex flex-1 items-center justify-center">
          <LoadingDots />
        </div>
      </Screen>
    );
  }

  const series = data.monthlySeries ?? [];
  const maxBar = Math.max(1, ...series.map((s) => s.revenueCents));
  const hasAnyRevenue = series.some((s) => s.revenueCents > 0) || data.totalRevenueCents > 0;

  function downloadCsv(): void {
    const rows = [
      ['type', 'name', 'count', 'revenue_cents'],
      ...data!.revenueByEvent.map((r) => ['event', r.title, String(r.paidCount), String(r.revenueCents)]),
      ['subscription', 'Membership subs', String(data!.activeSubscriptions), String(data!.subscriptionRevenueCents)],
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finances-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <Screen>
      <AppBar
        back
        title="Finances"
        trailing={
          <button className="ic-btn" onClick={downloadCsv} aria-label="Export">
            <Icon name="ios_share" />
          </button>
        }
      />
      <main className="flex-1 px-5 pb-6 overflow-y-auto content-wide lg:px-8">
        {/* Range segmented control */}
        <div className="seg mb-4">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRange(r.id)}
              className={`s${range === r.id ? ' on' : ''}`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* KPI grid */}
        <div className="grid2 grid grid-cols-2 gap-2.5 mb-4">
          <Card className="kpi">
            <div className="k-lbl">
              <Icon name="account_balance_wallet" size={14} />
              Gross revenue
            </div>
            <div className="k-num">{fmtCents(gross)}</div>
            {gross > 0 ? (
              <div className={`k-delta ${delta >= 0 ? 'up' : 'down'}`}>
                {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}%
              </div>
            ) : (
              <div className="k-delta" style={{ color: 'rgb(var(--muted))' }}>
                — no earnings yet
              </div>
            )}
          </Card>
          <Card className="kpi">
            <div className="k-lbl">
              <Icon name="savings" size={14} />
              MRR
            </div>
            <div className="k-num">{fmtCents(data.mrrCents)}</div>
            <div className="k-delta up">{data.activeSubscriptions} subs</div>
          </Card>
        </div>

        {/* 6-month bar chart. When there is no revenue yet we replace the
            empty bars (which read as "data missing" rather than "no money")
            with an explicit empty state so the admin understands the
            community simply hasn't earned anything yet. */}
        <Card className="p-4 mb-4">
          <div className="between mb-3">
            <span className="t-label-lg">Revenue · 6 months</span>
            <span className="t-body-md" style={{ margin: 0, fontSize: 11 }}>
              net of fees
            </span>
          </div>
          {hasAnyRevenue ? (
            <>
              <div className="bars">
                {series.map((m, i) => {
                  const isCur = i === series.length - 1;
                  const pct = Math.round((m.revenueCents / maxBar) * 100);
                  return (
                    <div key={m.month} className={`bar${isCur ? ' cur' : ''}`}>
                      <i style={{ height: `${Math.max(2, pct)}%` }} />
                    </div>
                  );
                })}
              </div>
              <div className="barlbls">
                {series.map((m) => (
                  <span key={m.month}>{monthLabel(m.month)}</span>
                ))}
              </div>
            </>
          ) : (
            <div
              className="text-center py-6"
              style={{ color: 'rgb(var(--muted))' }}
            >
              <Icon name="trending_up" size={32} style={{ opacity: 0.5 }} />
              <div className="t-label-lg mt-2" style={{ fontSize: 13 }}>
                No revenue yet
              </div>
              <div className="t-body-md" style={{ margin: '4px 0 0', fontSize: 11 }}>
                Publish a paid event or open subscriptions to start earning.
              </div>
            </div>
          )}
        </Card>

        {/* Revenue by event */}
        <div className="section-header">
          <span className="sh-title" style={{ fontSize: 16 }}>
            Revenue by event
          </span>
        </div>
        {data.revenueByEvent.length === 0 && (
          <div className="t-body-md mb-3 p-3" style={{ background: 'rgb(var(--surface-2))', borderRadius: 12 }}>
            No paid events yet. Once members pay, you'll see a per-event breakdown here.
          </div>
        )}
        {data.revenueByEvent.map((r) => (
          <div key={r.eventId} className="list-row">
            <div
              className="avatar sm grid place-items-center"
              style={{
                width: 36,
                height: 36,
                borderRadius: 9,
                background: 'rgb(var(--brand-wash))',
                color: 'rgb(var(--brand-ink))',
              }}
            >
              <Icon name="event" size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="t-label-lg truncate">{r.title}</div>
              <div className="t-body-md" style={{ margin: 0, fontSize: 11 }}>
                {r.paidCount} tickets
              </div>
            </div>
            <span className="t-label-lg">{fmtCents(r.revenueCents)}</span>
          </div>
        ))}

        {/* Subs row */}
        {data.activeSubscriptions > 0 && (
          <div className="list-row" style={{ border: 'none' }}>
            <div
              className="avatar sm grid place-items-center"
              style={{
                width: 36,
                height: 36,
                borderRadius: 9,
                background: '#EFE7FF',
                color: '#5B3D9E',
              }}
            >
              <Icon name="workspace_premium" size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="t-label-lg">Membership subs</div>
              <div className="t-body-md" style={{ margin: 0, fontSize: 11 }}>
                {data.activeSubscriptions} active
              </div>
            </div>
            <span className="t-label-lg">{fmtCents(data.subscriptionRevenueCents)}</span>
          </div>
        )}

        {hasAnyRevenue && (
          <AppButton variant="secondary" onClick={downloadCsv} className="mt-3">
            <Icon name="download" size={14} /> Export CSV
          </AppButton>
        )}

        {/* Recent payments */}
        {data.recentPayments?.length > 0 && (
          <>
            <div className="section-header mt-5">
              <span className="sh-title" style={{ fontSize: 16 }}>
                Recent payments
              </span>
            </div>
            <Card className="divide-y divide-border">
              {data.recentPayments.map((p) => {
                // Cross-role: from /admin/finances admins should be able to
                // click a payment and jump to /admin/payments/:pid/refund.
                // Previously the row was a static div, so to issue a refund
                // the admin had to dig through the event's payments list.
                const canRefund = p.status === 'succeeded';
                const onRowClick = canRefund
                  ? () => nav(`/admin/payments/${p.id}/refund`)
                  : undefined;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={onRowClick}
                    disabled={!canRefund}
                    className="flex items-center gap-3 px-4 py-3 w-full text-start"
                    style={{
                      background: 'transparent',
                      border: 0,
                      cursor: canRefund ? 'pointer' : 'default',
                    }}
                    aria-label={
                      canRefund
                        ? `Issue refund for ${p.payer?.name ?? 'member'}`
                        : undefined
                    }
                  >
                    <span
                      className="grid place-items-center"
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 11,
                        background:
                          p.status === 'refunded'
                            ? 'rgb(var(--error-wash))'
                            : 'rgb(var(--success-wash))',
                        color:
                          p.status === 'refunded'
                            ? 'rgb(var(--error))'
                            : 'rgb(var(--success))',
                      }}
                    >
                      <Icon name={p.status === 'refunded' ? 'undo' : 'payments'} size={18} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="t-label-lg truncate">
                        {p.payer?.name ?? p.payer?.email ?? 'Member'}
                      </div>
                      <div
                        className="t-body-md truncate"
                        style={{ margin: 0, fontSize: 11 }}
                      >
                        {p.eventTitle ?? 'Subscription'} ·{' '}
                        {new Date(p.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-end">
                      <div className="t-label-lg">{fmtCents(p.amountCents)}</div>
                      <Pill
                        tone={
                          p.status === 'succeeded'
                            ? 'ok'
                            : p.status === 'refunded'
                            ? 'warn'
                            : 'neutral'
                        }
                      >
                        {p.status === 'succeeded'
                          ? 'Paid'
                          : p.status === 'refunded'
                          ? 'Refunded'
                          : p.status}
                      </Pill>
                    </div>
                    {canRefund && (
                      <Icon
                        name="chevron_right"
                        size={18}
                        style={{ color: 'rgb(var(--muted))' }}
                      />
                    )}
                  </button>
                );
              })}
            </Card>
          </>
        )}
      </main>
    </Screen>
  );
}

function monthLabel(ym: string): string {
  // ym = '2026-03' -> 'Mar'
  const [, m] = ym.split('-');
  const idx = Number(m) - 1;
  return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][idx] ?? '';
}
