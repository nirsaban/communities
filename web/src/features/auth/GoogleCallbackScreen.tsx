import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppBar, Screen } from '../../components/AppBar';
import { AppButton } from '../../components/AppButton';
import { Icon } from '../../components/Icon';
import { LoadingDots } from '../../components/LoadingDots';
import { completeGoogleSignIn } from '../../lib/google-oauth';

// Lands here after the user grants consent on accounts.google.com. The URL
// looks like /auth/google/callback?code=...&state=... — we exchange both
// with the backend, then route the user into the app. Mounted at
// /auth/google/callback in routes.tsx.
export function GoogleCallbackScreen() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  const code = params.get('code') ?? '';
  const state = params.get('state') ?? '';
  const oauthError = params.get('error');

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (oauthError) {
      setError(
        oauthError === 'access_denied'
          ? 'You declined Google sign-in.'
          : `Google sign-in failed (${oauthError}).`,
      );
      return;
    }
    if (!code || !state) {
      setError('Google sign-in callback was missing code or state.');
      return;
    }
    completeGoogleSignIn(code, state)
      .then(({ redirectTo }) => nav(redirectTo, { replace: true }))
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, [code, state, oauthError, nav]);

  return (
    <Screen>
      <AppBar showTitle={false} />
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center content-sm lg:px-8">
        {!error && (
          <>
            <div
              className="blob"
              style={{
                background: 'rgb(var(--brand-wash))',
                color: 'rgb(var(--brand-ink))',
              }}
            >
              <Icon name="lock_person" size={36} />
            </div>
            <h1 className="t-display-md mt-5 mb-1">Signing you in…</h1>
            <p className="t-body-md mb-6">Just a moment.</p>
            <LoadingDots />
          </>
        )}
        {error && (
          <>
            <div
              className="blob"
              style={{
                background: 'rgb(var(--error-wash))',
                color: 'rgb(var(--error))',
              }}
            >
              <Icon name="error" size={36} />
            </div>
            <h1 className="t-display-md mt-5 mb-1">Couldn't sign in with Google</h1>
            <p className="t-body-md mb-6 max-w-sm">{error}</p>
            <AppButton onClick={() => nav('/login', { replace: true })}>
              Back to sign in
            </AppButton>
          </>
        )}
      </main>
    </Screen>
  );
}
