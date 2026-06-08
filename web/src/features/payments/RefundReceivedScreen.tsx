import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppBar, Screen } from '../../components/AppBar';
import { AppButton } from '../../components/AppButton';
import { Card } from '../../components/Card';
import { Icon } from '../../components/Icon';
import { fmtCents } from '../../lib/format';
import { useAuth } from '../../lib/auth';
import { useMyCommunities } from '../../lib/queries';

export function RefundReceivedScreen() {
  const nav = useNavigate();
  const auth = useAuth();
  const [params] = useSearchParams();
  const amountCents = Number(params.get('amount') ?? '0');
  const eventTitle = params.get('event') ?? 'your event';
  const refundId = params.get('ref') ?? '';
  const last4 = params.get('last4') ?? '4242';

  const { data: mine } = useMyCommunities();
  const isAdmin = mine?.some(
    (m) => m.membership.role === 'admin' || m.membership.role === 'subadmin',
  );
  const isSuper = auth.user?.globalRole === 'superadmin';

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
          <Icon name="paid" size={46} />
        </div>
        <h1 className="t-display-md" style={{ margin: '22px 0 6px' }}>
          Refund on its way
        </h1>
        <p className="t-body-lg" style={{ color: 'rgb(var(--muted))', margin: '0 0 24px' }}>
          {amountCents > 0 ? (
            <>
              {fmtCents(amountCents)} is being returned to your Visa ···· {last4}.
            </>
          ) : (
            <>The refund is being returned to the original card.</>
          )}
        </p>

        <Card className="text-start" style={{ width: '100%', padding: 16, marginBottom: 8 }}>
          <div
            className="between"
            style={{
              paddingBottom: 8,
              borderBottom: '1px solid rgb(var(--border))',
            }}
          >
            <span className="t-body-lg" style={{ fontSize: 14 }}>
              {eventTitle}
            </span>
            <span className="t-label-lg" style={{ color: 'rgb(var(--success))' }}>
              {amountCents > 0 ? `+ ${fmtCents(amountCents)}` : '+ refund'}
            </span>
          </div>
          <div className="between" style={{ paddingTop: 10 }}>
            <span className="t-body-md" style={{ margin: 0 }}>
              Arrives in 5–10 days
            </span>
            {refundId && (
              <span
                className="t-body-md"
                style={{
                  margin: 0,
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 11,
                }}
              >
                #{refundId}
              </span>
            )}
          </div>
        </Card>

        <div className="mt-auto w-full pt-8">
          {isAdmin || isSuper ? (
            <AppButton variant="secondary" onClick={() => nav('/admin/finances')}>
              Back to finances
            </AppButton>
          ) : (
            <AppButton variant="secondary" onClick={() => nav('/home')}>
              Done
            </AppButton>
          )}
        </div>
      </main>
    </Screen>
  );
}
