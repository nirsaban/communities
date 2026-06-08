import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppBar, Screen } from '../../components/AppBar';
import { AppButton } from '../../components/AppButton';
import { Icon } from '../../components/Icon';
import { Input } from '../../components/Input';
import { LoadingDots } from '../../components/LoadingDots';
import { api, extractError } from '../../lib/api';
import { useUpdateEvent, type EventDraft } from '../../lib/queries';
import { fmtCents } from '../../lib/format';

type PricingType = 'free' | 'paid' | 'subscription_only' | 'external';

type Tier = {
  id: string;
  name: string;
  priceCents: number;
  description?: string;
};

export function EditPricingScreen() {
  const { eid } = useParams<{ eid: string }>();
  const nav = useNavigate();
  const update = useUpdateEvent(eid);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pricingType, setPricingType] = useState<PricingType>('free');
  const [priceDisplay, setPriceDisplay] = useState('');
  const [title, setTitle] = useState('');
  const [paidCount, setPaidCount] = useState(0);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [tierDraft, setTierDraft] = useState<Tier>({ id: '', name: '', priceCents: 0 });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await api.get(`/events/${eid}`);
        if (!alive) return;
        const ev = r.data?.data ?? {};
        const pricing = (ev.pricing as { type?: string; priceCents?: number; tiers?: Tier[] }) ?? {};
        setTitle(String(ev.title ?? ''));
        setPricingType(
          pricing.type === 'paid'
            ? 'paid'
            : pricing.type === 'subscription_only'
            ? 'subscription_only'
            : pricing.type === 'external'
            ? 'external'
            : 'free',
        );
        setPriceDisplay(pricing.priceCents ? String(pricing.priceCents / 100) : '');
        setPaidCount(Number(ev.metrics?.paidCount ?? 0));
        setTiers((pricing.tiers ?? []) as Tier[]);
      } catch (err) {
        setError(extractError(err).message);
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [eid]);

  async function save(): Promise<void> {
    setError(null);
    try {
      const pricing: EventDraft['pricing'] =
        pricingType === 'free'
          ? { type: 'free', priceCents: 0, currency: 'ILS' }
          : pricingType === 'paid'
          ? {
              type: 'paid',
              priceCents: Math.max(0, Math.round(Number.parseFloat(priceDisplay || '0') * 100)),
              currency: 'ILS',
            }
          : pricingType === 'external'
          ? { type: 'external', priceCents: 0, currency: 'ILS' }
          : { type: 'subscription_only', priceCents: 0, currency: 'ILS' };
      await update.mutateAsync({ pricing });
      nav(-1);
    } catch (err) {
      setError(extractError(err).message);
    }
  }

  function addTier(): void {
    const id = `tier-${Date.now()}`;
    setEditingTierId(id);
    setTierDraft({ id, name: '', priceCents: 0 });
  }

  function commitTier(): void {
    if (!editingTierId) return;
    setTiers((prev) => {
      const idx = prev.findIndex((t) => t.id === editingTierId);
      if (idx === -1) return [...prev, tierDraft];
      const copy = [...prev];
      copy[idx] = tierDraft;
      return copy;
    });
    setEditingTierId(null);
  }

  function removeTier(id: string): void {
    setTiers((prev) => prev.filter((t) => t.id !== id));
    if (editingTierId === id) setEditingTierId(null);
  }

  if (loading) {
    return (
      <Screen>
        <AppBar back title="Pricing" />
        <div className="flex flex-1 items-center justify-center">
          <LoadingDots />
        </div>
      </Screen>
    );
  }

  const showWarning = paidCount > 0;

  return (
    <Screen>
      <AppBar
        back
        title="Pricing"
        trailing={
          <button
            onClick={save}
            disabled={update.isPending}
            style={{
              color: 'rgb(var(--brand-ink))',
              fontWeight: 600,
              fontSize: 14,
              border: 0,
              background: 'transparent',
              cursor: 'pointer',
              padding: '0 12px',
            }}
          >
            Save
          </button>
        }
      />
      <main className="flex-1 px-5 pb-6 overflow-y-auto">
        {title && (
          <p className="t-body-md mb-3" style={{ margin: 0 }}>
            {title}
          </p>
        )}
        {error && (
          <div className="t-body-md mb-3" style={{ color: 'rgb(var(--error))' }}>
            {error}
          </div>
        )}

        {showWarning && (
          <div
            className="card flex items-start gap-2.5 p-3 mb-4"
            style={{ background: 'rgb(var(--warning-wash))', border: 'none' }}
          >
            <Icon name="info" size={18} style={{ color: 'rgb(var(--warning))', marginTop: 2 }} />
            <div className="t-body-md flex-1" style={{ fontSize: 12, margin: 0 }}>
              {paidCount} people already paid — pricing changes apply to <b>new RSVPs only</b>.
            </div>
          </div>
        )}

        {/* Pricing type radio cards */}
        <label className="t-label-sm" style={{ display: 'block', margin: '4px 0 10px' }}>
          Pricing model
        </label>
        <div className="flex flex-col gap-2.5 mb-4">
          {(
            [
              { id: 'free', label: 'Free', icon: 'check_circle' },
              { id: 'paid', label: 'Paid · one-time', icon: 'sell' },
              { id: 'subscription_only', label: 'Subscription only', icon: 'workspace_premium' },
              { id: 'external', label: 'External ticket link', icon: 'open_in_new' },
            ] as const
          ).map((opt) => {
            const on = pricingType === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setPricingType(opt.id)}
                className={`price-opt${on ? ' on' : ''}`}
              >
                <Icon
                  name={opt.icon}
                  size={18}
                  style={{ color: on ? 'rgb(var(--brand))' : 'rgb(var(--muted))' }}
                />
                <div className="flex-1">
                  <div className="t-label-lg" style={{ fontSize: 13.5 }}>
                    {opt.label}
                  </div>
                </div>
                <Icon
                  name={on ? 'radio_button_checked' : 'radio_button_unchecked'}
                  size={18}
                  style={{ color: on ? 'rgb(var(--brand))' : 'rgb(var(--muted))' }}
                />
              </button>
            );
          })}
        </div>

        {pricingType === 'paid' && (
          <Input
            label="Base price"
            value={priceDisplay}
            onChange={(e) => setPriceDisplay(e.target.value)}
            leadingIcon="payments"
            placeholder="45"
            type="number"
            inputMode="decimal"
          />
        )}

        {pricingType === 'paid' && (
          <>
            <div className="t-label-sm mt-4 mb-2">Price tiers</div>
            <div className="card" style={{ padding: '4px 14px', marginBottom: 14 }}>
              {tiers.length === 0 && (
                <div className="t-body-md py-3" style={{ margin: 0, fontSize: 12 }}>
                  No tiers yet. Add an early-bird or member rate to layer discounts.
                </div>
              )}
              {tiers.map((t, idx) => (
                <div
                  key={t.id}
                  className="list-row"
                  style={{ border: idx === tiers.length - 1 ? 'none' : undefined }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="t-label-lg" style={{ fontSize: 13.5 }}>
                      {t.name || 'Untitled tier'}
                    </div>
                    {t.description && (
                      <div className="t-body-md" style={{ margin: 0, fontSize: 11 }}>
                        {t.description}
                      </div>
                    )}
                  </div>
                  <span className="t-label-lg">{fmtCents(t.priceCents)}</span>
                  <button
                    className="ic-btn"
                    aria-label="Edit"
                    onClick={() => {
                      setEditingTierId(t.id);
                      setTierDraft(t);
                    }}
                  >
                    <Icon name="edit" size={16} style={{ color: 'rgb(var(--muted))' }} />
                  </button>
                  <button
                    className="ic-btn"
                    aria-label="Remove"
                    onClick={() => removeTier(t.id)}
                  >
                    <Icon name="close" size={16} style={{ color: 'rgb(var(--muted))' }} />
                  </button>
                </div>
              ))}
            </div>

            {editingTierId && (
              <div className="card p-3 mb-3" style={{ border: '1px dashed rgb(var(--border-2))' }}>
                <div className="t-label-sm mb-2">Tier details</div>
                <Input
                  label="Name"
                  value={tierDraft.name}
                  onChange={(e) => setTierDraft({ ...tierDraft, name: e.target.value })}
                  placeholder="Early bird"
                />
                <Input
                  label="Description"
                  value={tierDraft.description ?? ''}
                  onChange={(e) =>
                    setTierDraft({ ...tierDraft, description: e.target.value })
                  }
                  placeholder="until Mar 5 · 20 left"
                />
                <Input
                  label="Price"
                  value={tierDraft.priceCents ? String(tierDraft.priceCents / 100) : ''}
                  onChange={(e) =>
                    setTierDraft({
                      ...tierDraft,
                      priceCents: Math.max(0, Math.round(Number.parseFloat(e.target.value || '0') * 100)),
                    })
                  }
                  type="number"
                  inputMode="decimal"
                  leadingIcon="payments"
                />
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <AppButton variant="secondary" onClick={() => setEditingTierId(null)}>
                    Cancel
                  </AppButton>
                  <AppButton variant="primary" onClick={commitTier}>
                    Save tier
                  </AppButton>
                </div>
              </div>
            )}

            <AppButton variant="secondary" onClick={addTier}>
              <Icon name="add" size={14} />
              Add a tier
            </AppButton>
          </>
        )}
      </main>
      <footer
        className="safe-bottom border-t px-4 py-3"
        style={{ background: 'rgb(var(--surface))', borderColor: 'rgb(var(--border))' }}
      >
        <AppButton variant="primary" onClick={save} loading={update.isPending}>
          Save pricing
        </AppButton>
      </footer>
    </Screen>
  );
}
