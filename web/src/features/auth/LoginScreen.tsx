import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, extractError } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { landingPathAfterAuth } from '../../lib/role';
import { startGoogleSignIn } from '../../lib/google-oauth';
import { useToast } from '../../components/Toast';
import { AppBar, Screen } from '../../components/AppBar';
import { Input, PasswordInput } from '../../components/Input';
import { AppButton } from '../../components/AppButton';
import { t } from '../../i18n';

export function LoginScreen() {
  const nav = useNavigate();
  const auth = useAuth();
  const [params] = useSearchParams();
  const toast = useToast();
  // Whitelist `next` to in-app paths so it can't be used as an open redirect.
  const rawNext = params.get('next');
  const next = rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : null;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

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
        <AppButton variant="secondary" onClick={onGoogle} loading={googleLoading}>
          <GoogleGlyph />
          {t.auth.continueWithGoogle}
        </AppButton>
      </main>
    </Screen>
  );
}

// Multi-colour Google "G" glyph. Inlined SVG so we don't depend on an icon
// font that doesn't ship a branded version, and so it stays sharp at any size.
function GoogleGlyph() {
  return (
    <svg
      viewBox="0 0 18 18"
      width={18}
      height={18}
      aria-hidden
      style={{ flexShrink: 0 }}
    >
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
