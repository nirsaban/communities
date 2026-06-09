import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, extractError } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { landingPathAfterAuth } from '../../lib/role';
import { AppBar, Screen } from '../../components/AppBar';
import { Input, PasswordInput } from '../../components/Input';
import { AppButton } from '../../components/AppButton';
import { t } from '../../i18n';

export function LoginScreen() {
  const nav = useNavigate();
  const auth = useAuth();
  const [params] = useSearchParams();
  // Whitelist `next` to in-app paths so it can't be used as an open redirect.
  const rawNext = params.get('next');
  const next = rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : null;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const r = await api.post('/auth/login', { email, password });
      const d = r.data?.data ?? {};
      const at = d.tokens?.accessToken;
      const rt = d.tokens?.refreshToken;
      if (!at || !rt) throw new Error('bad-response');
      auth.loginSuccess(at, rt, d.user);
      // Honor ?next= so the invite-accept flow can resume after sign-in.
      if (next) {
        nav(next, { replace: true });
        return;
      }
      const target = await landingPathAfterAuth(d.user);
      nav(target, { replace: true });
    } catch (err) {
      setError(extractError(err).code === 'INVALID_CREDENTIALS' ? t.auth.invalidCreds : extractError(err).message);
      setShake(true);
      setTimeout(() => setShake(false), 450);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <AppBar back showTitle={false} />
      <main className={`flex-1 px-5 pb-10 ${shake ? 'animate-shake' : ''}`}>
        <h1 className="t-display-lg mb-1.5">
          Welcome<br />back.
        </h1>
        <p className="t-body-md mb-6">
          New here?{' '}
          <Link to="/signup" style={{ color: 'rgb(var(--brand-ink))', fontWeight: 600 }}>
            Create an account
          </Link>
        </p>
        <form onSubmit={onSubmit} noValidate>
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
          <PasswordInput
            label={t.auth.password}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leadingIcon="lock"
            required
            dir="ltr"
          />
          <div className="mb-5 mt-1 text-end">
            <Link to="/forgot" className="text-[13px] font-semibold" style={{ color: 'rgb(var(--brand-ink))' }}>
              {t.auth.forgotLink}
            </Link>
          </div>
          {error && (
            <div className="mb-3 rounded-md bg-bad-wash px-3 py-2 text-sm text-bad">{error}</div>
          )}
          <AppButton type="submit" loading={loading}>
            {t.auth.submitLogin}
          </AppButton>
        </form>
        <div className="my-5 flex items-center gap-3">
          <span className="divider flex-1" />
          <span className="t-label-sm">{t.auth.orSeparator}</span>
          <span className="divider flex-1" />
        </div>
        <AppButton variant="secondary" className="mb-2.5">
          <span className="msr">apple</span>{t.auth.continueWithApple}
        </AppButton>
        <AppButton variant="secondary">{t.auth.continueWithGoogle}</AppButton>
      </main>
    </Screen>
  );
}
