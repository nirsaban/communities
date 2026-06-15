import { useMemo, useState } from 'react';
import { AppBar, Screen } from '../../components/AppBar';
import { Avatar } from '../../components/Avatar';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { Icon } from '../../components/Icon';
import { Input } from '../../components/Input';
import { Pill } from '../../components/Pill';
import { Shimmer } from '../../components/Shimmer';
import { communityContext } from '../../lib/community-context';
import {
  useCommunitySubscriptions,
  useMyCommunities,
  type CommunitySubscription,
} from '../../lib/queries';

const STATUS_LABEL: Record<CommunitySubscription['status'], string> = {
  active: 'Active',
  trialing: 'Trialing',
  past_due: 'Past due',
  canceled: 'Canceled',
  incomplete: 'Incomplete',
};

const STATUS_TONE: Record<CommunitySubscription['status'], 'ok' | 'warn' | 'bad' | 'neutral'> = {
  active: 'ok',
  trialing: 'ok',
  past_due: 'warn',
  canceled: 'bad',
  incomplete: 'warn',
};

type Filter = 'all' | 'monthly' | 'annual' | 'past_due';

const FILTER_LABEL: Record<Filter, string> = {
  all: 'All',
  monthly: 'Monthly',
  annual: 'Annual',
  past_due: 'Past due',
};

export function SubscriptionManagementScreen() {
  const ctx = communityContext();
  const { data: mine } = useMyCommunities();
  const cid = ctx.currentCommunityId ?? mine?.[0]?.community.id;
  const { data, isLoading } = useCommunitySubscriptions(cid);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = useMemo(() => {
    const list = data ?? [];
    return list.filter((s) => {
      if (filter === 'monthly' && s.plan !== 'monthly') return false;
      if (filter === 'annual' && s.plan !== 'annual') return false;
      if (filter === 'past_due' && s.status !== 'past_due') return false;
      if (!q) return true;
      const term = q.toLowerCase();
      return (
        s.name.toLowerCase().includes(term) ||
        s.email.toLowerCase().includes(term)
      );
    });
  }, [data, q, filter]);

  const activeCount = useMemo(
    () => (data ?? []).filter((s) => s.status === 'active' || s.status === 'trialing').length,
    [data],
  );
  const canceledCount = useMemo(
    () => (data ?? []).filter((s) => s.status === 'canceled').length,
    [data],
  );

  return (
    <Screen>
      <AppBar back title="Subscriptions" />
      <main className="flex-1 px-5 pb-6 content-sm lg:px-8">
        <div className="grid2 mb-4 grid grid-cols-2 gap-2.5">
          <Card className="kpi">
            <div className="k-lbl">
              <Icon name="workspace_premium" size={14} />
              Active subscribers
            </div>
            <div className="k-num font-display">{activeCount}</div>
          </Card>
          <Card className="kpi">
            <div className="k-lbl">
              <Icon name="cancel" size={14} />
              Canceled
            </div>
            <div className="k-num font-display">{canceledCount}</div>
          </Card>
        </div>

        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          leadingIcon="search"
          placeholder="Search by name or email…"
        />

        <div className="row mb-3 flex items-center gap-2 overflow-x-auto" style={{ paddingBottom: 4 }}>
          {(Object.keys(FILTER_LABEL) as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="chip"
              style={{
                background:
                  filter === f ? 'rgb(var(--brand))' : 'rgb(var(--surface-2))',
                color: filter === f ? '#fff' : 'rgb(var(--on-bg))',
                borderColor: 'transparent',
                height: 32,
                flexShrink: 0,
              }}
            >
              {FILTER_LABEL[f]}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="space-y-2">
            <Shimmer style={{ height: 72 }} />
            <Shimmer style={{ height: 72 }} />
            <Shimmer style={{ height: 72 }} />
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <EmptyState
            icon="workspace_premium"
            title="No subscribers"
            body={q || filter !== 'all' ? 'Try different filters' : 'Subscribers will appear here once members sign up'}
          />
        )}

        <div className="space-y-2">
          {filtered.map((s) => {
            const tone = STATUS_TONE[s.status];
            return (
              <Card key={s.id} className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar name={s.name} src={s.photoUrl} size={48} />
                  <div className="flex-1 min-w-0">
                    <div className="t-label-lg truncate">{s.name || 'Member'}</div>
                    <div className="t-body-md truncate" style={{ margin: 0, fontSize: 11 }} dir="ltr">
                      {s.email}
                    </div>
                    <div className="row mt-1 flex items-center gap-1.5">
                      <Pill tone="neutral">
                        <Icon name={s.plan === 'monthly' ? 'calendar_month' : 'event_available'} size={11} />
                        {s.plan === 'monthly' ? 'Monthly' : 'Annual'}
                      </Pill>
                      {s.currentPeriodEnd && (
                        <span className="t-body-md" style={{ margin: 0, fontSize: 11 }}>
                          {s.cancelAtPeriodEnd ? 'Ends' : 'Renews'}{' '}
                          {new Date(s.currentPeriodEnd).toLocaleDateString(undefined)}
                        </span>
                      )}
                    </div>
                  </div>
                  <Pill tone={tone}>{STATUS_LABEL[s.status]}</Pill>
                </div>
              </Card>
            );
          })}
        </div>
      </main>
    </Screen>
  );
}
