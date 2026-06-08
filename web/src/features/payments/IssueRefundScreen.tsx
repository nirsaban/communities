import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppBar, Screen } from '../../components/AppBar';
import { AppButton } from '../../components/AppButton';
import { Avatar } from '../../components/Avatar';
import { Card } from '../../components/Card';
import { Icon } from '../../components/Icon';
import { Input } from '../../components/Input';
import { LoadingDots } from '../../components/LoadingDots';
import { extractError } from '../../lib/api';
import { usePayment, useRefundPayment } from '../../lib/queries';
import { fmtCents } from '../../lib/format';

type Reason = 'requested_by_customer' | 'duplicate' | 'fraudulent';

const REASONS: Array<{ id: Reason; label: string; icon: string }> = [
  { id: 'requested_by_customer', label: 'Customer request', icon: 'help' },
  { id: 'duplicate', label: 'Duplicate charge', icon: 'content_copy' },
  { id: 'fraudulent', label: 'Fraud', icon: 'gpp_bad' },
];

export function IssueRefundScreen() {
  const { pid } = useParams<{ pid: string }>();
  const nav = useNavigate();
  const { data: payment, isLoading } = usePayment(pid);
  const refund = useRefundPayment();

  const [mode, setMode] = useState<'full' | 'partial'>('full');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState<Reason>('requested_by_customer');
  const [reasonOpen, setReasonOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refundCents = (() => {
    if (!payment) return 0;
    if (mode === 'full') return payment.amountCents - (payment.refundedAmountCents ?? 0);
    return Math.max(0, Math.round(Number.parseFloat(amount || '0') * 100));
  })();

  function openConfirm(): void {
    if (mode === 'partial' && refundCents <= 0) {
      setError('Enter an amount for the partial refund');
      return;
    }
    setError(null);
    setConfirmOpen(true);
  }

  async function submit(): Promise<void> {
    if (!pid) return;
    setError(null);
    try {
      const amountCents = mode === 'partial' ? refundCents : undefined;
      await refund.mutateAsync({ pid, amountCents, reason });
      nav('/payments/refunded');
    } catch (err) {
      setError(extractError(err).message);
    }
  }

  if (isLoading) {
    return (
      <Screen>
        <AppBar back title="Issue refund" />
        <div className="flex flex-1 items-center justify-center">
          <LoadingDots />
        </div>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppBar back title="Issue refund" />
      <main className="flex-1 px-5 pb-6 overflow-y-auto">
        {error && (
          <div className="t-body-md mb-3" style={{ color: 'rgb(var(--error))' }}>
            {error}
          </div>
        )}

        {/* Order card */}
        {payment && (
          <Card
            className="flex items-center gap-2.5 p-3 mb-4"
            style={{ padding: 12 }}
          >
            <Avatar name={payment.payer?.name} size={40} />
            <div className="flex-1 min-w-0">
              <div className="t-label-lg truncate">
                {payment.payer?.name ?? payment.payer?.email ?? 'Member'}
              </div>
              <div className="t-body-md truncate" style={{ margin: 0, fontSize: 11 }}>
                {payment.eventTitle ?? 'Subscription'} · paid{' '}
                {new Date(payment.createdAt).toLocaleDateString()}
              </div>
            </div>
            <span className="t-label-lg">{fmtCents(payment.amountCents)}</span>
          </Card>
        )}

        {/* Mode segmented control */}
        <div className="seg mb-4">
          {(['full', 'partial'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`s${mode === m ? ' on' : ''}`}
            >
              {m === 'full' ? 'Full refund' : 'Partial'}
            </button>
          ))}
        </div>

        {mode === 'partial' && (
          <Input
            label="Amount"
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="50"
            leadingIcon="payments"
          />
        )}

        {/* Reason select */}
        <div className="field">
          <label>Reason</label>
          <button
            type="button"
            onClick={() => setReasonOpen((v) => !v)}
            className="control w-full text-start"
            style={{ background: 'rgb(var(--surface))', cursor: 'pointer' }}
          >
            <Icon name="help" />
            <span className="grow t-body-md" style={{ margin: 0 }}>
              {REASONS.find((r) => r.id === reason)?.label}
            </span>
            <Icon name={reasonOpen ? 'expand_less' : 'expand_more'} />
          </button>
          {reasonOpen && (
            <div
              className="card mt-2 p-1"
              style={{ border: '1px solid rgb(var(--border))' }}
            >
              {REASONS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setReason(r.id);
                    setReasonOpen(false);
                  }}
                  className="flex items-center gap-2 w-full text-start px-3 py-2.5"
                  style={{
                    background: reason === r.id ? 'rgb(var(--brand-wash))' : 'transparent',
                    border: 0,
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  <Icon name={r.icon} size={16} />
                  {r.label}
                  {reason === r.id && (
                    <Icon
                      name="check"
                      size={16}
                      style={{ marginInlineStart: 'auto', color: 'rgb(var(--brand))' }}
                    />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
      <footer
        className="safe-bottom border-t px-4 py-3"
        style={{ background: 'rgb(var(--surface))', borderColor: 'rgb(var(--border))' }}
      >
        <AppButton
          variant="danger"
          onClick={openConfirm}
          loading={refund.isPending}
          disabled={refund.isPending || refundCents <= 0}
        >
          Issue refund
        </AppButton>
      </footer>

      {/* Confirm dialog */}
      {confirmOpen && payment && (
        <>
          <div className="scrim" onClick={() => setConfirmOpen(false)} />
          <div className="dialog">
            <div
              className="blob"
              style={{
                width: 56,
                height: 56,
                borderRadius: 18,
                background: 'rgb(var(--error-wash))',
                color: 'rgb(var(--error))',
                margin: '0 auto 14px',
              }}
            >
              <Icon name="undo" size={28} />
            </div>
            <div className="t-title-lg center" style={{ marginBottom: 6 }}>
              Refund {fmtCents(refundCents)}?
            </div>
            <p className="t-body-md center" style={{ margin: '0 0 16px' }}>
              This refunds {payment.payer?.name ?? 'the member'} via Stripe
              {payment.eventId ? ' and releases their spot' : ''}. This can't be undone.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <AppButton variant="secondary" onClick={() => setConfirmOpen(false)}>
                Cancel
              </AppButton>
              <AppButton variant="danger" onClick={submit} loading={refund.isPending}>
                Refund
              </AppButton>
            </div>
          </div>
        </>
      )}
    </Screen>
  );
}
