import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppBar, Screen } from '../../components/AppBar';
import { AppButton } from '../../components/AppButton';
import { Card } from '../../components/Card';
import { Icon } from '../../components/Icon';
import { LoadingDots } from '../../components/LoadingDots';
import { useEvent, useCheckout } from '../../lib/queries';
import { fmtCents, fmtEventWhen } from '../../lib/format';
import { extractError } from '../../lib/api';
import { t } from '../../i18n';

const SERVICE_FEE_BPS = 500; // 5% — mirrors STRIPE_PLATFORM_FEE_BPS default

export function CheckoutScreen() {
  const { eid } = useParams<{ eid: string }>();
  const nav = useNavigate();
  const { data: ev } = useEvent(eid);
  const checkout = useCheckout();
  const [error, setError] = useState<string | null>(null);

  if (!ev) {
    return (
      <Screen>
        <AppBar back title="Checkout" />
        <div className="flex flex-1 items-center justify-center">
          <LoadingDots />
        </div>
      </Screen>
    );
  }

  const subtotal = ev.priceCents;
  const fee = Math.round((subtotal * SERVICE_FEE_BPS) / 10_000);
  const total = subtotal + fee;

  async function pay(): Promise<void> {
    if (!eid) return;
    setError(null);
    try {
      const r = await checkout.mutateAsync(eid);
      if (r?.sessionUrl) {
        window.location.assign(r.sessionUrl);
      } else {
        setError('No checkout link returned from the server');
      }
    } catch (err) {
      setError(extractError(err).message);
    }
  }

  const w = fmtEventWhen(ev.startAt);

  return (
    <Screen>
      <AppBar back title="Checkout" />
      <main className="flex-1 px-5 pb-6">
        <Card className="mb-5 p-3.5">
          <div className="event-card" style={{ border: 'none', boxShadow: 'none', padding: 0 }}>
            <div className="cover imgph">
              <span className="lbl">cover</span>
            </div>
            <div className="body">
              <span className="when">{w.line}</span>
              <span className="ttl">{ev.title}</span>
              <span className="meta">
                <Icon name="person" size={14} />1 ticket
              </span>
            </div>
          </div>
        </Card>

        <div className="list-row">
          <span className="t-body-lg flex-1">1 × standard ticket</span>
          <span className="t-label-lg">{fmtCents(subtotal)}</span>
        </div>
        <div className="list-row">
          <span className="t-body-md flex-1" style={{ color: 'rgb(var(--on-bg))' }}>
            Service fee
          </span>
          <span className="t-label-lg">{fmtCents(fee)}</span>
        </div>
        <div className="between flex items-center justify-between py-3.5">
          <span className="t-title-md">Total</span>
          <span className="t-title-lg font-display">{fmtCents(total)}</span>
        </div>

        <div
          className="mt-1 rounded-md p-4"
          style={{ background: 'rgb(var(--surface-2))', borderRadius: 14 }}
        >
          <div className="row mb-3 flex items-center gap-1.5">
            <Icon name="lock" size={18} className="text-muted" />
            <span className="t-label-sm" style={{ margin: 0 }}>
              Secured by Stripe
            </span>
          </div>
          <p className="t-body-md" style={{ margin: 0 }}>
            You'll be redirected to Stripe's secure checkout. We don't store card details.
          </p>
        </div>

        {error && (
          <div className="mt-3 rounded-md bg-bad-wash px-3 py-2 text-sm text-bad">{error}</div>
        )}

        <AppButton onClick={pay} loading={checkout.isPending} className="mt-4">
          <span className="msr">lock</span>
          Pay {fmtCents(total)}
        </AppButton>
        <p className="t-body-md center mt-3 text-center">Continue to Stripe's secure checkout.</p>
      </main>
    </Screen>
  );
}
