import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar, Screen } from '../../components/AppBar';
import { AppButton } from '../../components/AppButton';
import { Card } from '../../components/Card';
import { Icon } from '../../components/Icon';
import { Input } from '../../components/Input';
import { extractError } from '../../lib/api';
import { useSuperCreateCommunity } from '../../lib/queries';

type Category = 'religious' | 'educational' | 'professional' | 'hobby' | 'other';
type Plan = 'standard' | 'pro' | 'free';

// Mirror Batch E #74: category mapping. Right-hand label tracks the design copy
// ("Maker & tech", "Faith & study"), the id maps to the backend enum.
const CATEGORIES: Array<{ id: Category; label: string }> = [
  { id: 'religious', label: 'Faith & study' },
  { id: 'educational', label: 'Education' },
  { id: 'professional', label: 'Maker & tech' },
  { id: 'hobby', label: 'Hobby & lifestyle' },
  { id: 'other', label: 'Other' },
];

const PLANS: Array<{ id: Plan; label: string }> = [
  { id: 'standard', label: 'Standard · 30-day trial' },
  { id: 'pro', label: 'Pro · billed monthly' },
  { id: 'free', label: 'Free · open beta' },
];

// Inline "select" matching the design's read-only control with trailing chevron.
function SelectField<T extends string>({
  label,
  icon,
  value,
  options,
  onChange,
}: {
  label: string;
  icon: string;
  value: T;
  options: Array<{ id: T; label: string }>;
  onChange: (v: T) => void;
}) {
  const cur = options.find((o) => o.id === value) ?? options[0];
  return (
    <div className="field">
      <label>{label}</label>
      <div className="control" style={{ position: 'relative' }}>
        <Icon name={icon} />
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          className="absolute inset-0 w-full h-full bg-transparent border-0 outline-none opacity-0 cursor-pointer"
          style={{ appearance: 'none' }}
        >
          {options.map((o) => (
            <option key={o.id} value={o.id} style={{ color: '#000' }}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="flex-1 truncate" style={{ pointerEvents: 'none' }}>
          {cur.label}
        </span>
        <Icon name="expand_more" />
      </div>
    </div>
  );
}

export function CreateCommunityScreen() {
  const nav = useNavigate();
  const create = useSuperCreateCommunity();
  const [name, setName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [category, setCategory] = useState<Category>('professional');
  // Plan is captured for UX but the backend currently only stores it via the
  // invitation pipeline; keep the value local so the design works end-to-end.
  const [plan, setPlan] = useState<Plan>('standard');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ token?: string; communityId?: string } | null>(null);

  async function submit(): Promise<void> {
    setError(null);
    if (name.trim().length < 2) {
      setError('Enter a community name');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
      setError('Enter a valid email for the initial admin');
      return;
    }
    try {
      const r = await create.mutateAsync({
        name: name.trim(),
        category,
        privacy: 'invite_only',
        initialAdminEmail: adminEmail.trim(),
      });
      setResult({ token: r.invitation?.token, communityId: r.community.id });
    } catch (err) {
      setError(extractError(err).message);
    }
  }

  if (result) {
    return (
      <Screen className="dark">
        <AppBar
          title="Community created"
          trailing={
            <button onClick={() => nav('/super/communities')} className="ic-btn" aria-label="Close">
              <Icon name="close" />
            </button>
          }
        />
        <main className="flex-1 px-5 pb-6">
          <Card className="p-5 text-center">
            <span
              className="grid place-items-center mx-auto mb-3"
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: 'rgb(var(--success-wash))',
                color: 'rgb(var(--success))',
              }}
            >
              <Icon name="check_circle" size={36} />
            </span>
            <h2 className="t-title-md mb-1">Community created</h2>
            <p className="t-body-md" style={{ margin: 0 }}>
              We sent an admin invite to {adminEmail}
            </p>
          </Card>
          {result.token && (
            <Card className="p-3 mt-3">
              <div className="t-label-sm mb-1">Invite link (for testing)</div>
              <a
                href={`/invite/${result.token}`}
                target="_blank"
                rel="noreferrer"
                className="t-body-md block"
                style={{
                  margin: 0,
                  fontFamily: 'monospace',
                  color: 'rgb(var(--brand-ink))',
                  wordBreak: 'break-all',
                }}
                dir="ltr"
              >
                {`${window.location.origin}/invite/${result.token}`}
              </a>
              <div className="t-body-md" style={{ margin: '8px 0 0', fontSize: 11 }}>
                Open in a new tab to test the admin's acceptance flow.
              </div>
            </Card>
          )}
          <div className="space-y-2 mt-5">
            {result.communityId && (
              <AppButton onClick={() => nav(`/super/communities/${result.communityId}`)}>
                Open community
              </AppButton>
            )}
            <AppButton variant="secondary" onClick={() => nav('/super/communities')}>
              Back to communities
            </AppButton>
          </div>
        </main>
      </Screen>
    );
  }

  return (
    <Screen className="dark">
      <AppBar
        title="New community"
        leading={
          <button onClick={() => nav('/super/communities')} className="ic-btn" aria-label="Close">
            <Icon name="close" />
          </button>
        }
      />
      <main className="flex-1 px-5 pb-6 flex flex-col">
        <h1 className="t-display-md" style={{ margin: '2px 0 20px' }}>
          Provision a<br />community
        </h1>

        {error && (
          <div className="t-body-md mb-3" style={{ color: 'rgb(var(--error))' }}>
            {error}
          </div>
        )}

        <Input
          label="Community name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Jerusalem Makers"
          leadingIcon="hub"
        />

        <Input
          label="Initial admin email"
          value={adminEmail}
          onChange={(e) => setAdminEmail(e.target.value)}
          type="email"
          dir="ltr"
          leadingIcon="mail"
          placeholder="admin@example.com"
          hint="They'll receive an onboarding invite as Community Admin."
        />

        <SelectField
          label="Category"
          icon="category"
          value={category}
          options={CATEGORIES}
          onChange={setCategory}
        />

        <SelectField
          label="Plan"
          icon="workspace_premium"
          value={plan}
          options={PLANS}
          onChange={setPlan}
        />
      </main>
      <footer
        className="safe-bottom px-4 py-3"
        style={{ background: 'rgb(var(--bg))' }}
      >
        <AppButton variant="primary" onClick={submit} loading={create.isPending} disabled={create.isPending}>
          Create &amp; send invite
        </AppButton>
      </footer>
    </Screen>
  );
}
