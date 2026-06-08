import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, extractError } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { AppBar, Screen } from '../../components/AppBar';
import { Input } from '../../components/Input';
import { AppButton } from '../../components/AppButton';
import { Avatar } from '../../components/Avatar';
import { Icon } from '../../components/Icon';
import { t } from '../../i18n';

export function ProfileSetupScreen() {
  const nav = useNavigate();
  const auth = useAuth();
  const [name, setName] = useState(auth.user?.name ?? '');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const r = await api.patch('/auth/me', { name });
      const updated = r.data?.data?.user ?? { ...auth.user!, name };
      auth.setUser(updated);
      nav('/onboard/interests');
    } catch (err) {
      setError(extractError(err).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <div className="flex gap-1.5 px-5 pt-3.5">
        <span style={{ height: 4, flex: 1, borderRadius: 9, background: 'rgb(var(--brand))' }} />
        <span style={{ height: 4, flex: 1, borderRadius: 9, background: 'rgb(var(--border-2))' }} />
      </div>
      <AppBar
        showTitle={false}
        trailing={<span className="t-label-sm pe-3">{t.onboarding.stepOfN(1, 2)} · Your profile</span>}
      />
      <main className="flex flex-1 flex-col px-5 pb-10">
        <h1 className="t-display-md mb-6 mt-1">{t.onboarding.profileTitle}</h1>
        <div className="mb-7 flex justify-center">
          <div className="relative">
            <Avatar name={name} size={64} />
            <div
              className="absolute -bottom-1 -right-1 grid place-items-center"
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'rgb(var(--brand))',
                border: '3px solid rgb(var(--surface))',
              }}
            >
              <Icon name="photo_camera" size={20} className="!text-white" />
            </div>
          </div>
        </div>
        <form onSubmit={onSubmit} noValidate>
          <Input
            label={t.onboarding.displayName}
            value={name}
            onChange={(e) => setName(e.target.value)}
            leadingIcon="badge"
            required
          />
          <Input
            label={`${t.onboarding.username} · optional`}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            leadingIcon="alternate_email"
            trailingIcon={username.length >= 3 ? 'check_circle' : undefined}
            dir="ltr"
          />
          {error && <div className="mb-3 rounded-md bg-bad-wash px-3 py-2 text-sm text-bad">{error}</div>}
          <div className="mt-6">
            <AppButton type="submit" loading={loading} disabled={!name.trim()}>
              {t.app.continue}
            </AppButton>
          </div>
        </form>
      </main>
    </Screen>
  );
}
