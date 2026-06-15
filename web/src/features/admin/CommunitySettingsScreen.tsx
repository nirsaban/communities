import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar, Screen } from '../../components/AppBar';
import { AppButton } from '../../components/AppButton';
import { Card } from '../../components/Card';
import { Icon } from '../../components/Icon';
import { Input } from '../../components/Input';
import { LoadingDots } from '../../components/LoadingDots';
import { api, extractError } from '../../lib/api';
import { communityContext } from '../../lib/community-context';
import { useMyCommunities, useUpdateCommunity, type UpdateCommunityInput } from '../../lib/queries';

type Privacy = 'public' | 'invite_only' | 'application';
type Category = 'religious' | 'educational' | 'professional' | 'hobby' | 'other';

const CATEGORY_LABEL: Record<Category, string> = {
  religious: 'Faith & study',
  educational: 'Education',
  professional: 'Professional',
  hobby: 'Hobby',
  other: 'Other',
};
const PRIVACY_LABEL: Record<Privacy, string> = {
  public: 'Public',
  invite_only: 'Invite only',
  application: 'Application',
};

type Sheet =
  | { kind: 'name'; value: string }
  | { kind: 'description'; value: string }
  | { kind: 'category'; value: Category }
  | { kind: 'privacy'; value: Privacy }
  | { kind: 'welcome'; value: string }
  | { kind: 'rules'; value: string }
  | { kind: 'archive' }
  | { kind: 'delete'; typed: string }
  | { kind: 'transfer'; email: string }
  | null;

export function CommunitySettingsScreen() {
  const nav = useNavigate();
  const ctx = communityContext();
  const { data: mine } = useMyCommunities();
  const cid = ctx.currentCommunityId ?? mine?.[0]?.community.id;
  const update = useUpdateCommunity(cid);

  const [loading, setLoading] = useState(true);
  const [topError, setTopError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('other');
  const [privacy, setPrivacy] = useState<Privacy>('public');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [rules, setRules] = useState('');
  const [primary, setPrimary] = useState('#FF5C35');
  const [sheet, setSheet] = useState<Sheet>(null);

  useEffect(() => {
    if (!cid) return;
    let alive = true;
    (async () => {
      try {
        const r = await api.get(`/communities/${cid}`);
        if (!alive) return;
        const c = r.data?.data ?? {};
        setName(String(c.name ?? ''));
        setDescription(String(c.description ?? ''));
        setCategory((c.category as Category) ?? 'other');
        setPrivacy((c.privacy as Privacy) ?? 'public');
        const settings = (c.settings as {
          welcomeMessage?: string;
          rules?: string;
          branding?: { primaryColor?: string };
        }) ?? {};
        setWelcomeMessage(String(settings.welcomeMessage ?? ''));
        setRules(String(settings.rules ?? ''));
        if (settings.branding?.primaryColor) setPrimary(settings.branding.primaryColor);
      } catch (err) {
        setTopError(extractError(err).message);
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [cid]);

  async function patchField(field: Partial<UpdateCommunityInput>): Promise<void> {
    setTopError(null);
    try {
      await update.mutateAsync(field);
      setSheet(null);
    } catch (err) {
      setTopError(extractError(err).message);
    }
  }

  if (loading) {
    return (
      <Screen>
        <AppBar back title="Community settings" />
        <div className="flex flex-1 items-center justify-center">
          <LoadingDots />
        </div>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppBar back title="Community settings" />
      <main className="flex-1 px-5 pb-6 overflow-y-auto content-sm lg:px-8">
        {topError && (
          <div className="t-body-md mb-3" style={{ color: 'rgb(var(--error))' }}>
            {topError}
          </div>
        )}

        {/* General */}
        <div className="t-label-sm mb-2">General</div>
        <Card style={{ padding: '4px 14px', marginBottom: 18 }}>
          <ListRow
            icon="badge"
            label="Name"
            value={name || '—'}
            onClick={() => setSheet({ kind: 'name', value: name })}
          />
          <ListRow
            icon="category"
            label="Category"
            value={CATEGORY_LABEL[category]}
            onClick={() => setSheet({ kind: 'category', value: category })}
          />
          <ListRow
            icon="notes"
            label="Description"
            value={description ? truncate(description) : 'Add a description'}
            onClick={() => setSheet({ kind: 'description', value: description })}
            isLast
          />
        </Card>

        {/* Customization */}
        <div className="t-label-sm mb-2">Customization</div>
        <Card style={{ padding: '4px 14px', marginBottom: 18 }}>
          <ListRow
            icon="palette"
            label="Branding"
            trailing={
              <span
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 5,
                  background: primary,
                  display: 'inline-block',
                }}
              />
            }
            onClick={() => nav('/admin/branding')}
          />
          <ListRow
            icon="lock"
            label="Privacy & joining"
            value={PRIVACY_LABEL[privacy]}
            onClick={() => setSheet({ kind: 'privacy', value: privacy })}
          />
          <ListRow
            icon="admin_panel_settings"
            label="Roles & permissions"
            onClick={() => nav('/admin/members/roles')}
            isLast
          />
        </Card>

        {/* Experience */}
        <div className="t-label-sm mb-2">Experience</div>
        <Card style={{ padding: '4px 14px', marginBottom: 18 }}>
          <ListRow
            icon="waving_hand"
            label="Welcome message"
            value={welcomeMessage ? truncate(welcomeMessage) : 'Add a welcome'}
            onClick={() => setSheet({ kind: 'welcome', value: welcomeMessage })}
          />
          <ListRow
            icon="gavel"
            label="Rules"
            value={rules ? `${rules.split('\n').length} lines` : 'Add house rules'}
            onClick={() => setSheet({ kind: 'rules', value: rules })}
            isLast
          />
        </Card>

        {/* Danger zone. These backends are not wired yet (see DangerSheet
            onConfirm: setTopError('… not yet implemented')), so we surface
            that up front instead of letting the admin tap through, type
            their community name, and only THEN learn nothing happened. */}
        <div className="t-label-sm mb-2" style={{ color: 'rgb(var(--error))' }}>
          Danger zone
        </div>
        <div className="dz">
          <DzRowComingSoon
            icon="swap_horiz"
            label="Transfer ownership"
            sub="Coming soon · contact support to transfer today"
          />
          <DzRowComingSoon
            icon="archive"
            label="Archive community"
            sub="Coming soon · hide & freeze, reversible"
          />
          <DzRowComingSoon
            icon="delete_forever"
            label="Delete community"
            sub="Coming soon · contact support to delete"
            errorLabel
          />
        </div>
      </main>

      {sheet && (
        <>
          <div className="scrim" onClick={() => setSheet(null)} />
          <div className="dialog">
            {sheet.kind === 'name' && (
              <EditTextSheet
                title="Community name"
                value={sheet.value}
                onCancel={() => setSheet(null)}
                onSave={(v) => patchField({ name: v.trim() })}
              />
            )}
            {sheet.kind === 'description' && (
              <EditTextSheet
                title="Description"
                value={sheet.value}
                multiline
                onCancel={() => setSheet(null)}
                onSave={(v) => patchField({ description: v.trim() })}
              />
            )}
            {sheet.kind === 'welcome' && (
              <EditTextSheet
                title="Welcome message"
                value={sheet.value}
                multiline
                onCancel={() => setSheet(null)}
                onSave={(v) =>
                  patchField({ settings: { welcomeMessage: v.trim(), rules: rules.trim() } })
                }
              />
            )}
            {sheet.kind === 'rules' && (
              <EditTextSheet
                title="House rules"
                value={sheet.value}
                multiline
                onCancel={() => setSheet(null)}
                onSave={(v) =>
                  patchField({
                    settings: { welcomeMessage: welcomeMessage.trim(), rules: v.trim() },
                  })
                }
              />
            )}
            {sheet.kind === 'category' && (
              <ChipPickerSheet
                title="Category"
                value={sheet.value}
                options={Object.entries(CATEGORY_LABEL) as Array<[Category, string]>}
                onCancel={() => setSheet(null)}
                onSave={(v) => patchField({ category: v })}
              />
            )}
            {sheet.kind === 'privacy' && (
              <ChipPickerSheet
                title="Privacy & joining"
                value={sheet.value}
                options={Object.entries(PRIVACY_LABEL) as Array<[Privacy, string]>}
                onCancel={() => setSheet(null)}
                onSave={(v) => patchField({ privacy: v })}
              />
            )}
            {sheet.kind === 'transfer' && (
              <DangerSheet
                title="Transfer ownership"
                body="Enter the new owner's email. They must already be a member. You'll lose admin access."
                inputLabel="New owner email"
                inputValue={sheet.email}
                onChange={(v) => setSheet({ kind: 'transfer', email: v })}
                confirmLabel="Transfer"
                onCancel={() => setSheet(null)}
                onConfirm={async () => {
                  setTopError('Ownership transfer is not yet implemented.');
                  setSheet(null);
                }}
              />
            )}
            {sheet.kind === 'archive' && (
              <DangerSheet
                title="Archive community"
                body="Members keep their data but the community will be hidden and frozen. You can restore it later."
                confirmLabel="Archive"
                onCancel={() => setSheet(null)}
                onConfirm={async () => {
                  setTopError('Archive is not yet implemented.');
                  setSheet(null);
                }}
              />
            )}
            {sheet.kind === 'delete' && (
              <DangerSheet
                title={`Delete ${name || 'community'}?`}
                body={`Type the community name to confirm. This permanently removes all events, posts and memberships.`}
                inputLabel={`Type "${name}"`}
                inputValue={sheet.typed}
                onChange={(v) => setSheet({ kind: 'delete', typed: v })}
                confirmDisabled={sheet.typed !== name}
                confirmLabel="Delete forever"
                onCancel={() => setSheet(null)}
                onConfirm={async () => {
                  setTopError('Delete is not yet implemented.');
                  setSheet(null);
                }}
              />
            )}
          </div>
        </>
      )}
    </Screen>
  );
}

function truncate(s: string, n = 28): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

function DzRowComingSoon({
  icon,
  label,
  sub,
  errorLabel,
}: {
  icon: string;
  label: string;
  sub: string;
  errorLabel?: boolean;
}) {
  return (
    <div
      className="dz-row"
      style={{
        cursor: 'not-allowed',
        opacity: 0.65,
        background: 'transparent',
        border: 'none',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 0',
      }}
      aria-disabled
    >
      <Icon name={icon} size={20} className="icon-error" />
      <div className="flex-1">
        <div
          className="t-label-lg"
          style={{ fontSize: 13.5, color: errorLabel ? 'rgb(var(--error))' : undefined }}
        >
          {label}
        </div>
        <div className="t-body-md" style={{ margin: 0, fontSize: 11 }}>
          {sub}
        </div>
      </div>
      <span
        className="chip"
        style={{
          background: 'rgb(var(--surface-2))',
          borderColor: 'transparent',
          height: 22,
          fontSize: 11,
          color: 'rgb(var(--muted))',
        }}
      >
        Soon
      </span>
    </div>
  );
}

function ListRow({
  icon,
  label,
  value,
  trailing,
  onClick,
  isLast,
}: {
  icon: string;
  label: string;
  value?: string;
  trailing?: React.ReactNode;
  onClick: () => void;
  isLast?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="list-row w-full text-start"
      style={{
        border: 'none',
        background: 'transparent',
        borderBottom: isLast ? 'none' : '1px solid rgb(var(--border))',
        cursor: 'pointer',
      }}
    >
      <Icon name={icon} size={18} style={{ color: 'rgb(var(--muted))' }} />
      <span className="grow t-body-lg" style={{ fontSize: 14 }}>
        {label}
      </span>
      {trailing ??
        (value && (
          <span className="t-body-md" style={{ margin: 0 }}>
            {value}
          </span>
        ))}
      <Icon name="chevron_right" size={18} style={{ color: 'rgb(var(--muted))' }} />
    </button>
  );
}

function EditTextSheet({
  title,
  value,
  multiline,
  onCancel,
  onSave,
}: {
  title: string;
  value: string;
  multiline?: boolean;
  onCancel: () => void;
  onSave: (v: string) => void;
}) {
  const [v, setV] = useState(value);
  return (
    <>
      <div className="t-title-lg center" style={{ marginBottom: 14 }}>
        {title}
      </div>
      {multiline ? (
        <div className="field">
          <div
            className="control"
            style={{ alignItems: 'stretch', padding: 12, minHeight: 100 }}
          >
            <textarea
              value={v}
              onChange={(e) => setV(e.target.value)}
              className="grow w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none resize-none"
              rows={4}
            />
          </div>
        </div>
      ) : (
        <Input value={v} onChange={(e) => setV(e.target.value)} />
      )}
      <div className="grid grid-cols-2 gap-2 mt-2">
        <AppButton variant="secondary" onClick={onCancel}>
          Cancel
        </AppButton>
        <AppButton variant="primary" onClick={() => onSave(v)}>
          Save
        </AppButton>
      </div>
    </>
  );
}

function ChipPickerSheet<T extends string>({
  title,
  value,
  options,
  onCancel,
  onSave,
}: {
  title: string;
  value: T;
  options: Array<[T, string]>;
  onCancel: () => void;
  onSave: (v: T) => void;
}) {
  const [v, setV] = useState<T>(value);
  return (
    <>
      <div className="t-title-lg center" style={{ marginBottom: 14 }}>
        {title}
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        {options.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setV(id)}
            className="chip"
            style={{
              background: v === id ? 'rgb(var(--brand-wash))' : 'rgb(var(--surface-2))',
              color: v === id ? 'rgb(var(--brand-ink))' : 'rgb(var(--on-bg))',
              borderColor: 'transparent',
              height: 34,
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <AppButton variant="secondary" onClick={onCancel}>
          Cancel
        </AppButton>
        <AppButton variant="primary" onClick={() => onSave(v)}>
          Save
        </AppButton>
      </div>
    </>
  );
}

function DangerSheet({
  title,
  body,
  inputLabel,
  inputValue,
  onChange,
  confirmDisabled,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
  body: string;
  inputLabel?: string;
  inputValue?: string;
  onChange?: (v: string) => void;
  confirmDisabled?: boolean;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => Promise<void> | void;
}) {
  return (
    <>
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
        <Icon name="warning" size={28} />
      </div>
      <div className="t-title-lg center" style={{ marginBottom: 6 }}>
        {title}
      </div>
      <p className="t-body-md center" style={{ margin: '0 0 16px' }}>
        {body}
      </p>
      {inputLabel && (
        <Input
          label={inputLabel}
          value={inputValue ?? ''}
          onChange={(e) => onChange?.(e.target.value)}
        />
      )}
      <div className="grid grid-cols-2 gap-2 mt-2">
        <AppButton variant="secondary" onClick={onCancel}>
          Cancel
        </AppButton>
        <AppButton variant="danger" disabled={confirmDisabled} onClick={onConfirm}>
          {confirmLabel}
        </AppButton>
      </div>
    </>
  );
}
