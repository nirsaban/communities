import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { AppBar, Screen } from '../../components/AppBar';
import { AppButton } from '../../components/AppButton';
import { Icon } from '../../components/Icon';
import { extractError } from '../../lib/api';
import { fmtCents } from '../../lib/format';
import { useCommunity, useMyCommunities, useSubscribeToCommunity } from '../../lib/queries';

type Plan = 'monthly' | 'annual';

// Fallback prices when the community hasn't configured tiers (rare; demoReset seeds them).
const FALLBACK_MONTHLY_CENTS = 4000;
const FALLBACK_ANNUAL_CENTS = 29000;

export function SubscriptionPlansScreen() {
  const { cid } = useParams<{ cid: string }>();
  const nav = useNavigate();
  const { data: community } = useCommunity(cid);
  const { data: mine } = useMyCommunities();
  const subscribe = useSubscribeToCommunity(cid);
  const [selected, setSelected] = useState<Plan>('annual');
  const [error, setError] = useState<string | null>(null);

  // Admin of this community → no self-subscribe; bounce to subscription manager.
  const myRoleHere = mine?.find((m) => m.community.id === cid)?.membership.role;
  if (myRoleHere === 'admin') {
    return <Navigate to="/admin/subscriptions" replace />;
  }
  if (myRoleHere === 'subadmin') {
    return <Navigate to="/admin" replace />;
  }

  const plans = community?.subscriptionPlans;
  const monthlyCents = plans?.monthlyPriceCents ?? FALLBACK_MONTHLY_CENTS;
  const annualCents = plans?.annualPriceCents ?? FALLBACK_ANNUAL_CENTS;
  const perks = plans?.perks?.length
    ? plans.perks
    : ['Free entry to all paid classes', 'Member-only events & early RSVP', 'Priority off the waitlist'];
  const annualSavingPct =
    monthlyCents > 0
      ? Math.max(0, Math.round(100 - (annualCents / (monthlyCents * 12)) * 100))
      : 0;

  const selectedCents = selected === 'annual' ? annualCents : monthlyCents;
  const monthlyEquiv = selected === 'annual' ? Math.round(annualCents / 12) : monthlyCents;
  const cycleLabel = selected === 'annual' ? 'year' : 'month';

  async function go(): Promise<void> {
    setError(null);
    try {
      const { sessionUrl } = await subscribe.mutateAsync(selected);
      window.location.href = sessionUrl;
    } catch (err) {
      setError(extractError(err).message);
    }
  }

  return (
    <Screen>
      <AppBar
        title="Membership"
        leading={
          <button onClick={() => nav(-1)} className="ic-btn" aria-label="Close">
            <Icon name="close" />
          </button>
        }
      />
      <main className="flex flex-1 flex-col px-5 pb-6">
        <h1 className="t-display-md" style={{ margin: '2px 0 6px' }}>
          Become a member
        </h1>
        <p className="t-body-md" style={{ margin: '0 0 18px' }}>
          {community
            ? `Free entry to all paid events at ${community.name}, member-only events, and early RSVPs.`
            : 'Free entry to all paid events, member-only events, and early RSVPs.'}
        </p>

        <div className="seg" style={{ marginBottom: 16 }}>
          <button
            className={`s ${selected === 'annual' ? 'on' : ''}`}
            onClick={() => setSelected('annual')}
          >
            {annualSavingPct > 0 ? `Annual · save ${annualSavingPct}%` : 'Annual'}
          </button>
          <button
            className={`s ${selected === 'monthly' ? 'on' : ''}`}
            onClick={() => setSelected('monthly')}
          >
            Monthly
          </button>
        </div>

        <div className="plan on" style={{ marginBottom: 14 }}>
          <div className="between" style={{ marginBottom: 10 }}>
            <div>
              <div className="t-title-md" style={{ fontSize: 15 }}>
                {selected === 'annual' ? 'Annual' : 'Monthly'}
              </div>
              <div className="t-body-md" style={{ margin: 0 }}>
                {selected === 'annual' ? 'Billed once a year' : 'Billed monthly'}
              </div>
            </div>
            <div style={{ textAlign: 'end' }}>
              <div className="t-display-md" style={{ fontSize: 26 }}>
                {fmtCents(selectedCents)}
              </div>
              <div className="t-body-md" style={{ margin: 0, fontSize: 11 }}>
                {selected === 'annual' ? `≈ ${fmtCents(monthlyEquiv)} / mo` : 'per month'}
              </div>
            </div>
          </div>
          {perks.map((perk) => (
            <div key={perk} className="feat">
              <span className="msr">check_circle</span>
              {perk}
            </div>
          ))}
        </div>

        {error && (
          <div className="t-body-md" style={{ color: 'rgb(var(--error))', marginBottom: 10 }}>
            {error}
          </div>
        )}

        <div className="mt-auto" style={{ paddingBottom: 24 }}>
          <AppButton variant="primary" onClick={go} loading={subscribe.isPending}>
            Subscribe · {fmtCents(selectedCents)} / {cycleLabel}
          </AppButton>
          <p className="t-body-md text-center" style={{ marginTop: 10 }}>
            Renews {selected === 'annual' ? 'yearly' : 'monthly'} · cancel anytime
          </p>
        </div>
      </main>
    </Screen>
  );
}
