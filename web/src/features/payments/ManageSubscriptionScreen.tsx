import { useNavigate } from 'react-router-dom';
import { AppBar, Screen } from '../../components/AppBar';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { Icon } from '../../components/Icon';
import { LoadingDots } from '../../components/LoadingDots';
import { useMyCommunities, useMySubscriptions } from '../../lib/queries';

const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  trialing: 'Trial',
  past_due: 'Past due',
  canceled: 'Canceled',
  incomplete: 'Incomplete',
};

const STATUS_CLASS: Record<string, string> = {
  active: 'sc-pub',
  trialing: 'sc-pub',
  past_due: 'sc-cancel',
  canceled: 'sc-done',
  incomplete: 'sc-cancel',
};

export function ManageSubscriptionScreen() {
  const nav = useNavigate();
  const { data: subs, isLoading } = useMySubscriptions();
  const { data: mine } = useMyCommunities();

  const communityName = (cid: string): string => {
    return mine?.find((m) => m.community.id === cid)?.community.name ?? 'Community';
  };

  return (
    <Screen>
      <AppBar back title="My membership" />
      <main className="flex flex-1 flex-col px-5 pb-6">
        {isLoading && (
          <div className="flex flex-1 items-center justify-center py-12">
            <LoadingDots />
          </div>
        )}

        {!isLoading && (!subs || subs.length === 0) && (
          <EmptyState
            icon="workspace_premium"
            title="No active memberships"
            body="Join a community as a paying member to see it here."
          />
        )}

        {subs?.map((s) => {
          const planLabel = s.plan === 'monthly' ? 'Monthly' : 'Annual';
          const statusClass = STATUS_CLASS[s.status] ?? 'sc-draft';
          return (
            <div key={s.id} style={{ marginBottom: 16 }}>
              <Card className="p-4">
                <div className="between" style={{ marginBottom: 12 }}>
                  <span
                    className="role-badge"
                    style={{ background: '#EFE7FF', color: '#5B3D9E' }}
                  >
                    <Icon name="workspace_premium" size={13} />
                    {planLabel} member
                  </span>
                  <span className={`status-chip ${statusClass}`} style={{ height: 20 }}>
                    {STATUS_LABEL[s.status] ?? s.status}
                  </span>
                </div>

                <div className="t-label-lg" style={{ marginBottom: 8 }}>
                  {communityName(s.communityId)}
                </div>

                <Row label="Plan" value={`${planLabel}`} />
                {s.currentPeriodEnd && (
                  <Row
                    label={s.cancelAtPeriodEnd ? 'Ends' : 'Renews'}
                    value={new Date(s.currentPeriodEnd).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  />
                )}
                <Row label="Payment" value="Visa ···· 4242" last />
              </Card>

              <Card className="mt-3" style={{ padding: '4px 14px' }}>
                <button
                  className="list-row w-full text-start"
                  onClick={() => alert('Billing history coming soon')}
                >
                  <Icon name="receipt_long" className="text-muted" />
                  <span className="flex-1 t-body-lg" style={{ fontSize: 14 }}>
                    Billing history
                  </span>
                  <Icon name="chevron_right" className="text-muted" />
                </button>
                <button
                  className="list-row w-full text-start"
                  style={{ borderBottom: 'none' }}
                  onClick={() => alert('Update payment method coming soon')}
                >
                  <Icon name="credit_card" className="text-muted" />
                  <span className="flex-1 t-body-lg" style={{ fontSize: 14 }}>
                    Update payment method
                  </span>
                  <Icon name="chevron_right" className="text-muted" />
                </button>
              </Card>

              {s.status === 'active' && !s.cancelAtPeriodEnd && (
                <button
                  onClick={() => nav(`/me/subscriptions/${s.id}/cancel`)}
                  className="btn btn-ghost"
                  style={{
                    color: 'rgb(var(--error))',
                    marginTop: 16,
                  }}
                >
                  Cancel membership
                </button>
              )}
              {s.cancelAtPeriodEnd && (
                <p
                  className="t-body-md text-center"
                  style={{ marginTop: 12 }}
                >
                  Will not renew after the current period ends.
                </p>
              )}
            </div>
          );
        })}
      </main>
    </Screen>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div
      className="between"
      style={{
        padding: '8px 0',
        borderBottom: last ? 'none' : '1px solid rgb(var(--border))',
      }}
    >
      <span className="t-body-lg" style={{ fontSize: 14 }}>
        {label}
      </span>
      <span className="t-label-lg">{value}</span>
    </div>
  );
}
