import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { AppBar, Screen } from '../../components/AppBar';
import { AppButton } from '../../components/AppButton';
import { Chip } from '../../components/Pill';
import { ProgressBar } from '../../components/ProgressBar';
import { t } from '../../i18n';

// Interest chips — match Batch A · screen 09 design.
const INTERESTS = [
  'Faith & study',
  'Wellness',
  'Tech & startups',
  'Parenting',
  'Music',
  'Food & cooking',
  'Volunteering',
  'Arts & design',
  'Sports',
  'Books',
  'Outdoors',
  'Language',
];

export function InterestsSelectorScreen() {
  const nav = useNavigate();
  const auth = useAuth();
  const [selected, setSelected] = useState<string[]>(auth.user?.interests ?? []);
  const [loading, setLoading] = useState(false);
  const n = selected.length;
  const ready = n >= 3;

  function toggle(name: string): void {
    setSelected((cur) => (cur.includes(name) ? cur.filter((c) => c !== name) : [...cur, name]));
  }

  async function onContinue(): Promise<void> {
    setLoading(true);
    try {
      const r = await api.patch('/auth/me', { interests: selected });
      const updated = r.data?.data?.user ?? { ...auth.user!, interests: selected };
      auth.setUser(updated);
      nav('/home', { replace: true });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <AppBar back showTitle={false} />
      <main className="flex-1 overflow-y-auto px-5 pb-8">
        <ProgressBar value={50} />
        <p className="t-label-sm mt-2">{t.onboarding.stepOfN(2, 2)}</p>
        <h1 className="t-display-md mt-2">{t.onboarding.interestsTitle}</h1>
        <p className="t-body-md mt-3">{t.onboarding.interestsBody}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {INTERESTS.map((name) => (
            <Chip key={name} selected={selected.includes(name)} onClick={() => toggle(name)}>
              {name}
            </Chip>
          ))}
        </div>
        <div className="mt-8">
          <AppButton disabled={!ready || loading} loading={loading} onClick={onContinue}>
            {ready ? `${t.app.continue} · ${n} selected` : t.onboarding.continueWithCount(n)}
          </AppButton>
        </div>
      </main>
    </Screen>
  );
}
