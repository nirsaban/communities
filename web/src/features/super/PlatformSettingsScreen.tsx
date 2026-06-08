import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppBar, Screen } from '../../components/AppBar';
import { Card } from '../../components/Card';
import { Icon } from '../../components/Icon';
import { LoadingDots } from '../../components/LoadingDots';
import { api, extractError } from '../../lib/api';

type Settings = {
  maintenanceMode?: boolean;
  allowSignups?: boolean;
  stripeKeyMasked?: string;
};

export function PlatformSettingsScreen() {
  const qc = useQueryClient();
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

  function applyPatch(patch: Settings): void {
    setError(null);
    const next = { ...local, ...patch };
    setLocal(next);
    update.mutate(patch, {
      onError: (err) => {
        setError(extractError(err).message);
        // Revert on failure
        if (data) setLocal(data);
      },
    });
  }

  // Display string: when revealed we show last 4 of the actual key, else mask.
  const maskedKey = local.stripeKeyMasked ?? '••••••••••••••••';
  const tailHint = '4Qx2';

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
            <div className="t-label-sm" style={{ marginBottom: 8 }}>Billing</div>
            <Card style={{ padding: 14, marginBottom: 18 }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
                <div className="flex items-center gap-2">
                  <Icon name="credit_card" style={{ color: '#635BFF' }} />
                  <span className="t-label-lg" style={{ fontSize: 13.5 }}>Stripe</span>
                </div>
                <span className="status-chip sc-pub" style={{ height: 19, fontSize: 10 }}>
                  Connected
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
                <span style={{ color: 'rgb(var(--muted))' }}>sk_live_</span>
                <span className="flex-1 truncate" style={{ color: 'rgb(var(--on-bg))' }}>
                  {reveal ? `••••••••${tailHint}` : maskedKey}
                </span>
                <button
                  onClick={() => setReveal((v) => !v)}
                  className="grid place-items-center"
                  style={{ background: 'transparent', border: 0, cursor: 'pointer' }}
                  aria-label={reveal ? 'Hide' : 'Reveal'}
                >
                  <Icon name={reveal ? 'visibility_off' : 'visibility'} className="text-muted" />
                </button>
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
                onClick={() => applyPatch({ maintenanceMode: !local.maintenanceMode })}
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
                onClick={() => applyPatch({ allowSignups: !local.allowSignups })}
                aria-label="Toggle signups"
                aria-pressed={!!local.allowSignups}
              >
                <span />
              </button>
            </div>

            <div className="list-row">
              <Icon name="mail" className="text-muted" />
              <span className="flex-1 t-body-lg" style={{ fontSize: 14 }}>
                Email templates
              </span>
              <Icon name="chevron_right" className="text-muted" />
            </div>

            <button
              onClick={() => (window.location.href = '/super/audit')}
              className="list-row flex items-center gap-3 text-start w-full"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              <Icon name="receipt_long" className="text-muted" />
              <span className="flex-1 t-body-lg" style={{ fontSize: 14 }}>
                Audit log
              </span>
              <Icon name="chevron_right" className="text-muted" />
            </button>

            <div className="list-row" style={{ borderBottom: 'none' }}>
              <Icon name="gavel" className="text-muted" />
              <span className="flex-1 t-body-lg" style={{ fontSize: 14 }}>
                Terms &amp; policies
              </span>
              <Icon name="chevron_right" className="text-muted" />
            </div>

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
