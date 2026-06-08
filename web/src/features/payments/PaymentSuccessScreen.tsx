import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppBar, Screen } from '../../components/AppBar';
import { AppButton } from '../../components/AppButton';
import { Card } from '../../components/Card';
import { Icon } from '../../components/Icon';

const REASON_LABELS: Record<string, string> = {
  card_declined: 'Your card was declined',
  insufficient_funds: 'Insufficient funds',
  expired_card: 'Card expired',
  user_canceled: 'You canceled the payment',
  network: 'Connection to the payment service failed',
};

export function PaymentSuccessScreen() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const sid = params.get('session_id');
  const eventTitle = params.get('event') ?? null;
  // Brief "confirming" state to mimic Stripe handoff feedback.
  const [confirming, setConfirming] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setConfirming(false), 900);
    return () => clearTimeout(t);
  }, []);

  if (confirming) {
    return (
      <Screen>
        <AppBar showTitle={false} />
        <main className="flex flex-1 flex-col items-center px-5 pb-10 text-center">
          <div
            className="blob"
            style={{
              background: 'rgb(var(--brand-wash))',
              color: 'rgb(var(--brand-ink))',
              marginTop: 46,
            }}
          >
            <Icon name="autorenew" size={46} className="animate-spin" />
          </div>
          <h1 className="t-display-md" style={{ margin: '22px 0 6px' }}>
            Confirming your payment…
          </h1>
          <p className="t-body-lg" style={{ color: 'rgb(var(--muted))', margin: 0 }}>
            One moment — we're finalizing your spot.
          </p>
        </main>
      </Screen>
    );
  }

  const receiptNumber = sid ? `#RC-${sid.slice(-5).toUpperCase()}` : '';

  return (
    <Screen>
      <AppBar showTitle={false} />
      <main className="flex flex-1 flex-col items-center px-5 pb-10 text-center">
        <div
          className="blob"
          style={{
            background: 'rgb(var(--success-wash))',
            color: 'rgb(var(--success))',
            marginTop: 46,
          }}
        >
          <Icon name="check_circle" size={48} />
        </div>
        <h1 className="t-display-md" style={{ margin: '22px 0 6px' }}>
          Payment confirmed
        </h1>
        <p className="t-body-lg" style={{ color: 'rgb(var(--muted))', margin: '0 0 24px' }}>
          {eventTitle ? `You're all set for ${eventTitle}.` : "You're all set — we saved your spot and emailed the receipt."}
        </p>

        <Card className="text-start" style={{ width: '100%', padding: 16, marginBottom: 8 }}>
          <div
            className="between"
            style={{ paddingBottom: 8, borderBottom: '1px solid rgb(var(--border))' }}
          >
            <span className="t-body-lg" style={{ fontSize: 14 }}>
              {eventTitle ?? 'Event ticket'} · 1 ticket
            </span>
            <span className="t-label-lg">paid</span>
          </div>
          <div className="between" style={{ paddingTop: 10 }}>
            <span className="t-body-md" style={{ margin: 0 }}>
              Visa ···· 4242
            </span>
            {receiptNumber && (
              <span
                className="t-body-md"
                style={{
                  margin: 0,
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 11,
                }}
              >
                {receiptNumber}
              </span>
            )}
          </div>
        </Card>

        <div className="mt-auto w-full pt-8 space-y-2.5">
          <AppButton onClick={() => nav('/me/rsvps')}>
            <Icon name="calendar_add_on" size={18} />
            View my RSVP
          </AppButton>
          {sid && (
            <AppButton
              variant="secondary"
              onClick={() => {
                const win = window.open(`/api/v1/payments/${sid}/receipt`, '_blank');
                if (!win) alert('Your browser blocked the popup.');
              }}
            >
              <Icon name="receipt_long" size={18} />
              Download receipt
            </AppButton>
          )}
          <AppButton variant="ghost" onClick={() => nav('/home')}>
            Back to home
          </AppButton>
        </div>
      </main>
    </Screen>
  );
}

export function PaymentCancelScreen() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const reason = params.get('reason');
  const reasonLabel = reason ? REASON_LABELS[reason] ?? reason : null;

  return (
    <Screen>
      <AppBar showTitle={false} />
      <main className="flex flex-1 flex-col items-center px-5 pb-10 text-center">
        <div
          className="blob"
          style={{
            background: 'rgb(var(--error-wash))',
            color: 'rgb(var(--error))',
            marginTop: 46,
          }}
        >
          <Icon name="credit_card_off" size={48} />
        </div>
        <h1 className="t-display-md" style={{ margin: '22px 0 6px' }}>
          Payment didn't go through
        </h1>
        <p className="t-body-lg" style={{ color: 'rgb(var(--muted))', margin: '0 0 22px' }}>
          {reasonLabel
            ? `${reasonLabel}. No charge was made — your spot is held for 10 minutes.`
            : "No charge was made. Your spot is held for 10 minutes."}
        </p>

        <Card
          className="flex items-center text-start"
          style={{ width: '100%', padding: 13, gap: 10, marginBottom: 8 }}
        >
          <Icon name="credit_card" className="text-muted" />
          <span className="flex-1 t-body-lg" style={{ fontSize: 14 }}>
            Visa ···· 4242
          </span>
          <span className="t-label-sm" style={{ margin: 0, color: 'rgb(var(--error))' }}>
            Declined
          </span>
        </Card>

        <div className="mt-auto w-full pt-8 space-y-2.5">
          <AppButton onClick={() => nav(-1)}>Try again</AppButton>
          <AppButton variant="secondary" onClick={() => nav(-1)}>
            <Icon name="add_card" size={18} />
            Use a different card
          </AppButton>
        </div>
      </main>
    </Screen>
  );
}
