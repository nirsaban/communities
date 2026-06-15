import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, extractError } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { startGoogleSignIn } from '../../lib/google-oauth';
import { useToast } from '../../components/Toast';
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
  const toast = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const str = useMemo(() => strength(password), [password]);

  async function onGoogle(): Promise<void> {
    setError(null);
    setGoogleLoading(true);
    try {
      await startGoogleSignIn();
    } catch (err) {
      setGoogleLoading(false);
      toast.error(err instanceof Error ? err.message : 'Google sign-in failed');
    }
  }

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
        <div className="my-5 flex items-center gap-3">
          <span className="divider flex-1" />
          <span className="t-label-sm">{t.auth.orSeparator}</span>
          <span className="divider flex-1" />
        </div>
        <AppButton variant="secondary" onClick={onGoogle} loading={googleLoading}>
          <GoogleGlyph />
          {t.auth.continueWithGoogle}
        </AppButton>
      </main>
    </Screen>
  );
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 18 18" width={18} height={18} aria-hidden style={{ flexShrink: 0 }}>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.12-.84 2.07-1.79 2.7v2.24h2.9c1.7-1.56 2.69-3.87 2.69-6.58z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.24c-.8.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.72A5.4 5.4 0 0 1 3.66 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l2.99-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z"
      />
    </svg>
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
