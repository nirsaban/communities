import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppBar, Screen } from '../../components/AppBar';
import { AppButton } from '../../components/AppButton';
import { Card } from '../../components/Card';
import { Icon } from '../../components/Icon';
import { LoadingDots } from '../../components/LoadingDots';
import { extractError } from '../../lib/api';
import { useCancelMySubscription, useMyCommunities, useMySubscriptions } from '../../lib/queries';

export function CancelSubscriptionScreen() {
  const { sid } = useParams<{ sid: string }>();
  const nav = useNavigate();
  const { data: subs, isLoading } = useMySubscriptions();
  const { data: mine } = useMyCommunities();
  const cancel = useCancelMySubscription();
  const [error, setError] = useState<string | null>(null);

  const sub = subs?.find((s) => s.id === sid);
  const communityName = sub
    ? mine?.find((m) => m.community.id === sub.communityId)?.community.name
    : undefined;
  const endDate = sub?.currentPeriodEnd
    ? new Date(sub.currentPeriodEnd).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  const [done, setDone] = useState(false);

  async function confirm(): Promise<void> {
    if (!sid) return;
    setError(null);
    try {
      await cancel.mutateAsync(sid);
      // Show the success card before bouncing back so the member has visual
      // proof the cancel went through. Mirrors /payments/success.
      setDone(true);
    } catch (err) {
      setError(extractError(err).message);
    }
  }

  if (isLoading) {
    return (
      <Screen>
        <AppBar back title="Cancel membership" />
        <div className="flex flex-1 items-center justify-center">
          <LoadingDots />
        </div>
      </Screen>
    );
  }

  if (done) {
    return (
      <Screen>
        <AppBar
          title="Cancellation scheduled"
          trailing={
            <button
              onClick={() => nav('/me/subscriptions')}
              className="ic-btn"
              aria-label="Close"
            >
              <Icon name="close" />
            </button>
          }
        />
        <main className="flex flex-1 flex-col items-center px-5 pb-6 text-center">
          <div
            className="blob mt-6"
            style={{
              background: 'rgb(var(--success-wash))',
              color: 'rgb(var(--success))',
            }}
          >
            <Icon name="check_circle" size={46} />
          </div>
          <h1 className="t-display-md mt-5 mb-1.5">Cancellation scheduled</h1>
          <p
            className="t-body-lg"
            style={{ color: 'rgb(var(--muted))', margin: '0 0 20px' }}
          >
            {endDate ? (
              <>
                You keep your member benefits until{' '}
                <b style={{ color: 'rgb(var(--on-bg))' }}>{endDate}</b>. No further
                charges after that.
              </>
            ) : (
              'You keep your member benefits through the end of the current period. No further charges after that.'
            )}
          </p>
          {communityName && (
            <Card className="w-full p-3.5 text-start" style={{ marginBottom: 16 }}>
              <div className="t-label-sm" style={{ marginBottom: 4 }}>
                Community
              </div>
              <div className="t-label-lg">{communityName}</div>
            </Card>
          )}
          <div className="w-full mt-auto" style={{ paddingBottom: 24 }}>
            <div className="flex flex-col gap-2.5">
              <AppButton onClick={() => nav('/me/subscriptions')}>
                Back to subscriptions
              </AppButton>
              <AppButton variant="secondary" onClick={() => nav('/home')}>
                Go to home
              </AppButton>
            </div>
          </div>
        </main>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppBar back title="Cancel membership" />
      <main className="flex flex-1 flex-col px-5 pb-6">
        <div
          className="blob"
          style={{
            background: 'rgb(var(--warning-wash))',
            color: 'rgb(var(--warning))',
            margin: '10px 0 16px',
          }}
        >
          <Icon name="sentiment_dissatisfied" size={40} />
        </div>
        <h1 className="t-display-md" style={{ margin: '0 0 10px' }}>
          Cancel your membership?
        </h1>
        <p
          className="t-body-lg"
          style={{ color: 'rgb(var(--muted))', margin: '0 0 16px' }}
        >
          {endDate ? (
            <>
              You'll keep your benefits until{' '}
              <b style={{ color: 'rgb(var(--on-bg))' }}>{endDate}</b>. After that, paid events
              return to full price.
            </>
          ) : (
            'You can keep using your membership until the end of the current period. Paid events will then return to full price.'
          )}
        </p>
        {communityName && (
          <p className="t-body-md" style={{ margin: '-6px 0 16px' }}>
            {communityName}
          </p>
        )}

        <Card className="p-3.5" style={{ marginBottom: 8 }}>
          <div className="t-label-sm" style={{ marginBottom: 8 }}>
            You'll lose
          </div>
          {['Free entry to paid events', 'Member-only events & content', 'Early RSVP priority'].map(
            (perk) => (
              <div
                key={perk}
                className="feat"
                style={{
                  color: 'rgb(var(--muted))',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginTop: 6,
                  fontSize: 13,
                }}
              >
                <Icon
                  name="cancel"
                  size={16}
                  style={{ color: 'rgb(var(--error))' }}
                />
                {perk}
              </div>
            ),
          )}
        </Card>

        {error && (
          <div className="t-body-md" style={{ color: 'rgb(var(--error))', marginTop: 10 }}>
            {error}
          </div>
        )}

        <div className="mt-auto" style={{ paddingBottom: 24 }}>
          <div className="flex flex-col gap-2.5">
            <AppButton variant="secondary" onClick={() => nav(-1)} disabled={cancel.isPending}>
              Keep my membership
            </AppButton>
            <AppButton
              variant="ghost"
              onClick={confirm}
              loading={cancel.isPending}
              disabled={cancel.isPending}
              style={{ color: 'rgb(var(--error))' }}
            >
              Cancel anyway
            </AppButton>
          </div>
        </div>
      </main>
    </Screen>
  );
}
