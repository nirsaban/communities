import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppBar, Screen } from '../../components/AppBar';
import { Card } from '../../components/Card';
import { Icon } from '../../components/Icon';
import { LoadingDots } from '../../components/LoadingDots';
import { api, extractError } from '../../lib/api';

type Settings = {
  maintenanceMode?: boolean;
  allowSignups?: boolean;
  // Backend currently reports `payplus` (PRD 09 §3). Older builds used
  // `stripeKeyMasked` — both are read in case the field name flips back.
  paymentGateway?: 'payplus' | 'stripe' | string;
  payplusKeyMasked?: string;
  stripeKeyMasked?: string;
};

export function PlatformSettingsScreen() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const [savedToast, setSavedToast] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ['platform-settings'],
    queryFn: async (): Promise<Settings> => {
      const r = await api.get('/super/settings');
      return (r.data?.data ?? {}) as Settings;
    },
  });
  const update = useMutation({
    mutationFn: async (patch: Settings) => api.patch('/super/settings', patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['platform-settings'] }),
  });

  const [local, setLocal] = useState<Settings>({});
  const [error, setError] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false);

  useEffect(() => {
    if (data) setLocal(data);
  }, [data]);

  function applyPatch(patch: Settings, label: string): void {
    setError(null);
    const next = { ...local, ...patch };
    setLocal(next);
    update.mutate(patch, {
      onSuccess: () => {
        setSavedToast(label);
        window.setTimeout(() => setSavedToast((t) => (t === label ? null : t)), 1800);
      },
      onError: (err) => {
        setError(extractError(err).message);
        // Revert on failure
        if (data) setLocal(data);
      },
    });
  }

  // Backend always returns a masked key (PCI: we never round-trip the secret).
  // The "reveal" toggle used to swap one mask for another which was misleading.
  // Now reveal shows the masked key (which contains the real last4 from
  // backend), hidden state shows a fully obscured placeholder.
  // Gateway label tracks the backend so a future Stripe switch flips the
  // chip + colour automatically without another web release.
  const gateway = local.paymentGateway ?? 'payplus';
  const isStripe = gateway === 'stripe';
  const backendMasked = (isStripe ? local.stripeKeyMasked : local.payplusKeyMasked) ?? local.payplusKeyMasked ?? local.stripeKeyMasked ?? '';
  const hasKey = backendMasked.length > 0;
  const gatewayLabel = isStripe ? 'Stripe' : 'PayPlus';
  const gatewayColor = isStripe ? '#635BFF' : 'rgb(var(--brand))';

  return (
    <Screen>
      <AppBar title="Platform settings" />
      <main className="flex-1 px-5 pb-6">
        {isLoading && (
          <div className="flex flex-1 items-center justify-center py-8">
            <LoadingDots />
          </div>
        )}

        {!isLoading && (
          <>
            {savedToast && (
              <div
                role="status"
                aria-live="polite"
                className="t-body-md mb-2 p-3 flex items-center gap-2"
                style={{
                  background: 'rgb(var(--success-wash))',
                  color: 'rgb(var(--success))',
                  borderRadius: 12,
                }}
              >
                <Icon name="check_circle" size={18} />
                <span>{savedToast}</span>
              </div>
            )}
            <div className="t-label-sm" style={{ marginBottom: 8 }}>Billing</div>
            <Card style={{ padding: 14, marginBottom: 18 }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
                <div className="flex items-center gap-2">
                  <Icon name="credit_card" style={{ color: gatewayColor }} />
                  <span className="t-label-lg" style={{ fontSize: 13.5 }}>{gatewayLabel}</span>
                </div>
                <span
                  className={`status-chip ${hasKey ? 'sc-pub' : 'sc-draft'}`}
                  style={{ height: 19, fontSize: 10 }}
                >
                  {hasKey ? 'Connected' : 'Not configured'}
                </span>
              </div>
              <div
                className="flex items-center gap-2 px-4"
                style={{
                  background: 'rgb(var(--surface-2))',
                  border: 'none',
                  borderRadius: 12,
                  height: 44,
                  fontFamily: "'DM Mono', ui-monospace, monospace",
                  fontSize: 12,
                }}
              >
                <span className="flex-1 truncate" style={{ color: 'rgb(var(--on-bg))' }}>
                  {hasKey ? (reveal ? backendMasked : '••••••••••••••••') : 'No key configured'}
                </span>
                {hasKey && (
                  <button
                    onClick={() => setReveal((v) => !v)}
                    className="grid place-items-center"
                    style={{ background: 'transparent', border: 0, cursor: 'pointer' }}
                    aria-label={reveal ? 'Hide key' : 'Show last 4 of key'}
                    title={reveal ? 'Hide key' : 'Show last 4 of key'}
                  >
                    <Icon name={reveal ? 'visibility_off' : 'visibility'} className="text-muted" />
                  </button>
                )}
              </div>
              <div
                className="t-body-md"
                style={{ margin: '8px 0 0', fontSize: 11, color: 'rgb(var(--muted))' }}
              >
                Full secret is never exposed — only the last 4 are stored for verification.
              </div>
            </Card>

            <div className="t-label-sm" style={{ marginBottom: 6 }}>System</div>

            <div className="list-row">
              <Icon name="construction" className="text-muted" />
              <div className="flex-1 min-w-0">
                <div className="t-body-lg" style={{ fontSize: 14 }}>Maintenance mode</div>
                <div className="t-body-md" style={{ margin: 0, fontSize: 11 }}>
                  Show a banner; block writes
                </div>
              </div>
              <button
                type="button"
                className={`toggle ${local.maintenanceMode ? 'on' : ''}`}
                onClick={() =>
                  applyPatch(
                    { maintenanceMode: !local.maintenanceMode },
                    !local.maintenanceMode ? 'Maintenance mode on' : 'Maintenance mode off',
                  )
                }
                aria-label="Toggle maintenance mode"
                aria-pressed={!!local.maintenanceMode}
              >
                <span />
              </button>
            </div>

            <div className="list-row">
              <Icon name="person_add" className="text-muted" />
              <div className="flex-1 t-body-lg" style={{ fontSize: 14 }}>
                Allow new signups
              </div>
              <button
                type="button"
                className={`toggle ${local.allowSignups ? 'on' : ''}`}
                onClick={() =>
                  applyPatch(
                    { allowSignups: !local.allowSignups },
                    !local.allowSignups ? 'Signups enabled' : 'Signups disabled',
                  )
                }
                aria-label="Toggle signups"
                aria-pressed={!!local.allowSignups}
              >
                <span />
              </button>
            </div>

            <button
              onClick={() => nav('/super/audit')}
              className="list-row flex items-center gap-3 text-start w-full"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', borderBottom: 'none' }}
            >
              <Icon name="receipt_long" className="text-muted" />
              <span className="flex-1 t-body-lg" style={{ fontSize: 14 }}>
                Audit log
              </span>
              <Icon name="chevron_right" className="text-muted" />
            </button>

            {error && (
              <div className="t-body-md mt-3 p-3" style={{ background: 'rgb(var(--error-wash))', color: 'rgb(var(--error))', borderRadius: 12 }}>
                {error}
              </div>
            )}
          </>
        )}
      </main>

    </Screen>
  );
}
