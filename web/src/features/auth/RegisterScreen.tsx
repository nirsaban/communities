import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, extractError } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { AppBar, Screen } from '../../components/AppBar';
import { Input, PasswordInput } from '../../components/Input';
import { AppButton } from '../../components/AppButton';
import { Icon } from '../../components/Icon';
import { t } from '../../i18n';

function strength(p: string): { score: number; label: string; color: string } {
  let s = 0;
  if (p.length >= 8) s++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  const labels = ['Very weak', 'Weak', 'Okay', 'Strong', 'Very strong'];
  const color = s >= 3 ? 'rgb(var(--success))' : s >= 2 ? 'rgb(var(--warning))' : 'rgb(var(--error))';
  return { score: s, label: labels[s], color };
}

export function RegisterScreen() {
  const nav = useNavigate();
  const auth = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const str = useMemo(() => strength(password), [password]);

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!agree) return;
    setError(null);
    setLoading(true);
    try {
      const r = await api.post('/auth/register', { email, password, name });
      const d = r.data?.data ?? {};
      auth.loginSuccess(d.tokens.accessToken, d.tokens.refreshToken, d.user);
      nav('/onboard/interests', { replace: true });
    } catch (err) {
      setError(extractError(err).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <AppBar back showTitle={false} />
      <main className="flex-1 px-5 pb-10">
        <h1 className="t-display-lg mb-1.5">
          Create your<br />account
        </h1>
        <p className="t-body-md mb-5">
          Already a member?{' '}
          <Link to="/login" style={{ color: 'rgb(var(--brand-ink))', fontWeight: 600 }}>
            Log in
          </Link>
        </p>
        <form onSubmit={onSubmit} noValidate>
          <Input
            label={t.auth.name}
            value={name}
            onChange={(e) => setName(e.target.value)}
            leadingIcon="person"
            autoComplete="name"
            required
          />
          <Input
            label={t.auth.email}
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leadingIcon="mail"
            required
            dir="ltr"
          />
          <div className="field" style={{ marginBottom: 10 }}>
            <label>{t.auth.password}</label>
            <PasswordContents value={password} onChange={setPassword} />
            {password.length > 0 && (
              <>
                <div className="mt-2 flex gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <span
                      key={i}
                      style={{
                        height: 4,
                        flex: 1,
                        borderRadius: 9,
                        background: i < str.score ? str.color : 'rgb(var(--border-2))',
                      }}
                    />
                  ))}
                </div>
                <div className="hint" style={{ color: str.color }}>
                  {str.label}
                </div>
              </>
            )}
          </div>
          <label className="mb-4 mt-2 flex items-start gap-2.5">
            <button
              type="button"
              onClick={() => setAgree((a) => !a)}
              className="mt-0.5 grid h-[22px] w-[22px] flex-shrink-0 place-items-center rounded-md"
              style={{
                background: agree ? 'rgb(var(--brand))' : 'transparent',
                border: agree ? 'none' : '1.5px solid rgb(var(--border-2))',
              }}
            >
              {agree && <Icon name="check" size={16} className="!text-white" />}
            </button>
            <span className="t-body-md">
              I agree to the{' '}
              <b style={{ color: 'rgb(var(--on-bg))' }}>Terms</b>{' '}and{' '}
              <b style={{ color: 'rgb(var(--on-bg))' }}>Privacy Policy</b>.
            </span>
          </label>
          {error && <div className="mb-3 rounded-md bg-bad-wash px-3 py-2 text-sm text-bad">{error}</div>}
          <AppButton type="submit" loading={loading} disabled={!agree || !name || !email || !password}>
            {t.auth.submitRegister}
          </AppButton>
        </form>
      </main>
    </Screen>
  );
}

function PasswordContents({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <PasswordInput
      value={value}
      onChange={(e) => onChange(e.target.value)}
      leadingIcon="lock"
      autoComplete="new-password"
      required
      dir="ltr"
    />
  );
}
