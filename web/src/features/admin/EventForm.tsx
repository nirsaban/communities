import { useState } from 'react';
import { AppButton } from '../../components/AppButton';
import { Icon } from '../../components/Icon';
import { Input } from '../../components/Input';
import type { EventDraft } from '../../lib/queries';

// Slices an ISO date down to the local "YYYY-MM-DDTHH:mm" form expected by datetime-local.
function isoToLocal(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function localToIso(local: string): string {
  return local ? new Date(local).toISOString() : '';
}

export type EventFormValues = {
  title: string;
  description: string;
  coverImageUrl: string;
  startLocal: string;
  endLocal: string;
  locationType: 'physical' | 'online' | 'hybrid';
  locationAddress: string;
  locationUrl: string;
  capacity: string;
  pricingType: 'free' | 'paid' | 'subscription_only' | 'external';
  priceCents: string;
  externalUrl: string;
  freeForSubscribers: boolean;
};

export function initialFormValues(seed?: Partial<EventFormValues>): EventFormValues {
  return {
    title: seed?.title ?? '',
    description: seed?.description ?? '',
    coverImageUrl: seed?.coverImageUrl ?? '',
    startLocal: seed?.startLocal ?? '',
    endLocal: seed?.endLocal ?? '',
    locationType: seed?.locationType ?? 'physical',
    locationAddress: seed?.locationAddress ?? '',
    locationUrl: seed?.locationUrl ?? '',
    capacity: seed?.capacity ?? '',
    pricingType: seed?.pricingType ?? 'free',
    priceCents: seed?.priceCents ?? '',
    externalUrl: seed?.externalUrl ?? '',
    freeForSubscribers: seed?.freeForSubscribers ?? false,
  };
}

export function valuesToDraft(v: EventFormValues, statusOverride?: 'draft' | 'published'): EventDraft {
  const capacityNum = v.capacity ? Number.parseInt(v.capacity, 10) : null;
  const draft: EventDraft = {
    title: v.title.trim(),
    description: v.description.trim() || undefined,
    coverImageUrl: v.coverImageUrl.trim() || undefined,
    startAt: localToIso(v.startLocal),
    endAt: localToIso(v.endLocal),
    location: {
      type: v.locationType,
      ...(v.locationType !== 'online' && v.locationAddress
        ? { address: v.locationAddress }
        : {}),
      ...(v.locationType !== 'physical' && v.locationUrl
        ? { url: v.locationUrl }
        : {}),
    },
    capacity: capacityNum && capacityNum > 0 ? capacityNum : null,
    pricing:
      v.pricingType === 'free'
        ? { type: 'free', priceCents: 0, currency: 'ILS' }
        : v.pricingType === 'paid'
        ? {
            type: 'paid',
            priceCents: Math.max(0, Math.round(Number.parseFloat(v.priceCents || '0') * 100)),
            currency: 'ILS',
          }
        : v.pricingType === 'external'
        ? {
            type: 'external',
            priceCents: 0,
            currency: 'ILS',
            externalUrl: v.externalUrl.trim() || undefined,
          }
        : { type: 'subscription_only', priceCents: 0, currency: 'ILS' },
  };
  if (statusOverride) draft.status = statusOverride;
  return draft;
}

export function eventToFormValues(ev: Record<string, unknown>): EventFormValues {
  const pricing = (ev.pricing as { type?: string; priceCents?: number }) ?? {};
  const location = (ev.location as { type?: string; address?: string; url?: string }) ?? {};
  return {
    title: String(ev.title ?? ''),
    description: String(ev.description ?? ''),
    coverImageUrl: String(ev.coverImageUrl ?? ''),
    startLocal: isoToLocal(ev.startAt as string),
    endLocal: isoToLocal(ev.endAt as string),
    locationType: (location.type as EventFormValues['locationType']) ?? 'physical',
    locationAddress: String(location.address ?? ''),
    locationUrl: String(location.url ?? ''),
    capacity: ev.capacity != null ? String(ev.capacity) : '',
    pricingType:
      pricing.type === 'paid'
        ? 'paid'
        : pricing.type === 'subscription_only'
        ? 'subscription_only'
        : pricing.type === 'external'
        ? 'external'
        : 'free',
    priceCents: pricing.priceCents ? String(pricing.priceCents / 100) : '',
    externalUrl: String((pricing as { externalUrl?: string }).externalUrl ?? ''),
    freeForSubscribers: !!(pricing as { subscriptionIncluded?: boolean }).subscriptionIncluded,
  };
}

type Props = {
  values: EventFormValues;
  onChange: (next: EventFormValues) => void;
  allowPricing: boolean;
  errors?: Partial<Record<keyof EventFormValues, string>>;
};

export function EventForm({ values, onChange, allowPricing, errors }: Props) {
  const set = <K extends keyof EventFormValues>(key: K, val: EventFormValues[K]) =>
    onChange({ ...values, [key]: val });

  return (
    <div className="space-y-3.5">
      <Input
        label="Title"
        value={values.title}
        onChange={(e) => set('title', e.target.value)}
        placeholder="Weekly product panel"
        error={errors?.title}
      />

      <div className="field">
        <label>Description</label>
        <div className="control" style={{ alignItems: 'stretch', padding: 12, minHeight: 110 }}>
          <textarea
            value={values.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="What's happening at this event?"
            className="grow w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none resize-none"
            rows={4}
          />
        </div>
      </div>

      <Input
        label="Cover image URL"
        value={values.coverImageUrl}
        onChange={(e) => set('coverImageUrl', e.target.value)}
        leadingIcon="image"
        placeholder="https://…"
        dir="ltr"
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Starts"
          type="datetime-local"
          value={values.startLocal}
          onChange={(e) => set('startLocal', e.target.value)}
          error={errors?.startLocal}
        />
        <Input
          label="Ends"
          type="datetime-local"
          value={values.endLocal}
          onChange={(e) => set('endLocal', e.target.value)}
          error={errors?.endLocal}
        />
      </div>

      <div className="field">
        <label>Location</label>
        <div className="row gap-2" style={{ display: 'flex', marginBottom: 8 }}>
          {(['physical', 'online', 'hybrid'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => set('locationType', t)}
              className="chip"
              style={{
                background: values.locationType === t ? 'rgb(var(--brand-wash))' : 'rgb(var(--surface-2))',
                color: values.locationType === t ? 'rgb(var(--brand-ink))' : 'rgb(var(--on-bg))',
                borderColor: 'transparent',
                height: 34,
              }}
            >
              <Icon
                name={t === 'physical' ? 'place' : t === 'online' ? 'videocam' : 'merge_type'}
                size={14}
              />
              {t === 'physical' ? 'In person' : t === 'online' ? 'Online' : 'Hybrid'}
            </button>
          ))}
        </div>
        {values.locationType !== 'online' && (
          <Input
            value={values.locationAddress}
            onChange={(e) => set('locationAddress', e.target.value)}
            placeholder="Full address"
            leadingIcon="location_on"
          />
        )}
        {values.locationType !== 'physical' && (
          <Input
            value={values.locationUrl}
            onChange={(e) => set('locationUrl', e.target.value)}
            placeholder="Zoom / Meet link"
            leadingIcon="link"
            dir="ltr"
            className="mt-2"
          />
        )}
      </div>

      {values.pricingType !== 'paid' && (
        <Input
          label="Capacity (leave empty for unlimited)"
          type="number"
          inputMode="numeric"
          value={values.capacity}
          onChange={(e) => set('capacity', e.target.value)}
          leadingIcon="groups"
          placeholder="50"
        />
      )}

      {allowPricing ? (
        <>
          <label className="t-label-sm" style={{ display: 'block', margin: '4px 0 10px' }}>
            Pricing
          </label>
          <div className="flex flex-col gap-2.5" style={{ marginBottom: 14 }}>
            {(
              [
                { id: 'free', label: 'Free', icon: 'check_circle' },
                { id: 'paid', label: 'Paid · one-time', icon: 'sell' },
                { id: 'subscription_only', label: 'Subscription only', icon: 'workspace_premium' },
                { id: 'external', label: 'External ticket link', icon: 'open_in_new' },
              ] as const
            ).map((opt) => {
              const on = values.pricingType === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => set('pricingType', opt.id)}
                  className={`price-opt${on ? ' on' : ''}`}
                  aria-pressed={on}
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
          {values.pricingType === 'paid' && (
            <div className="grid grid-cols-2 gap-2.5" style={{ marginBottom: 12 }}>
              <Input
                label="Price"
                value={values.priceCents}
                onChange={(e) => set('priceCents', e.target.value)}
                leadingIcon="payments"
                placeholder="50"
                type="number"
                inputMode="decimal"
              />
              <Input
                label="Capacity"
                value={values.capacity}
                onChange={(e) => set('capacity', e.target.value)}
                placeholder="50"
                type="number"
                inputMode="numeric"
              />
            </div>
          )}
          {values.pricingType === 'external' && (
            <Input
              label="Ticket URL"
              value={values.externalUrl}
              onChange={(e) => set('externalUrl', e.target.value)}
              leadingIcon="link"
              placeholder="https://eventbrite.com/…"
              dir="ltr"
            />
          )}
          {values.pricingType === 'paid' && (
            <div className="list-row">
              <Icon name="workspace_premium" size={18} style={{ color: 'rgb(var(--muted))' }} />
              <span className="grow t-body-lg" style={{ fontSize: 14, margin: 0 }}>
                Free for subscribers
              </span>
              <button
                type="button"
                onClick={() => set('freeForSubscribers', !values.freeForSubscribers)}
                className={`toggle${values.freeForSubscribers ? ' on' : ''}`}
                aria-pressed={values.freeForSubscribers}
              >
                <span />
              </button>
            </div>
          )}
        </>
      ) : (
        // Locked pricing — design unit 53. Matches the .lockfield treatment
        // (surface-2 background, dashed border, lock icon, "Admin only" badge).
        <div
          className="field"
          style={{
            background: 'rgb(var(--surface-2))',
            padding: 12,
            borderRadius: 12,
            border: '1px dashed rgb(var(--border-2))',
          }}
        >
          <label
            className="t-label-sm"
            style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <span>Pricing</span>
            <span
              className="inline-flex items-center"
              style={{
                gap: 4,
                padding: '2px 8px',
                borderRadius: 999,
                background: 'rgb(var(--surface))',
                color: 'rgb(var(--warn))',
                fontSize: 10,
                fontWeight: 600,
              }}
            >
              <Icon name="lock" size={11} />
              Admin only
            </span>
          </label>
          <div
            className="control"
            style={{
              background: 'transparent',
              border: '1px dashed rgb(var(--border-2))',
            }}
          >
            <Icon name="payments" size={16} />
            <span className="grow text-muted">Free</span>
            <Icon name="lock" size={16} />
          </div>
          <div className="hint" style={{ marginTop: 6 }}>
            Paid events require the Community Admin. This event will be free.
          </div>
        </div>
      )}
    </div>
  );
}

type SubmitBarProps = {
  saving: boolean;
  onSaveDraft: () => void;
  onPublish: () => void;
  publishLabel?: string;
};

export function FormSubmitBar({ saving, onSaveDraft, onPublish, publishLabel }: SubmitBarProps) {
  return (
    <footer
      className="safe-bottom border-t px-4 py-3"
      style={{ background: 'rgb(var(--surface))', borderColor: 'rgb(var(--border))' }}
    >
      <div className="grid grid-cols-2 gap-2.5">
        <AppButton variant="secondary" onClick={onSaveDraft} disabled={saving}>
          Save as draft
        </AppButton>
        <AppButton variant="primary" onClick={onPublish} loading={saving} disabled={saving}>
          {publishLabel ?? 'Publish'}
        </AppButton>
      </div>
    </footer>
  );
}
