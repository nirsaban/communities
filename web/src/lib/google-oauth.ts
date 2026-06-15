import { api, extractError } from './api';
import { authStore } from './auth';
import { landingPathAfterAuth } from './role';

// Storage key for the CSRF state we hand to Google. The state Google echoes
// back in the redirect must equal this exact value or we reject the callback.
const STATE_KEY = 'google.oauth.state';

/**
 * Kick off the Google sign-in flow. Asks the backend for a consent URL,
 * stores the CSRF state in sessionStorage, then redirects the browser to
 * Google. Returns nothing on success — control transfers to Google.
 */
export async function startGoogleSignIn(): Promise<void> {
  const r = await api.get('/auth/google');
  const { url, state } = (r.data?.data ?? {}) as { url?: string; state?: string };
  if (!url || !state) {
    throw new Error('Google sign-in is not available right now');
  }
  try {
    window.sessionStorage.setItem(STATE_KEY, state);
  } catch {
    // SessionStorage unavailable (private mode etc.) — we still proceed but
    // the callback will reject for state mismatch. Better to fail fast.
    throw new Error('Browser session storage is unavailable — cannot use Google sign-in');
  }
  window.location.assign(url);
}

export interface GoogleCallbackResult {
  /** Path to navigate to after the session is restored. */
  redirectTo: string;
}

/**
 * Complete the OAuth dance. Called by GoogleCallbackScreen with the `code`
 * and `state` Google appended to the redirect URI. Exchanges them with the
 * backend, hydrates the auth store, and returns the role-aware landing path.
 */
export async function completeGoogleSignIn(
  code: string,
  state: string,
): Promise<GoogleCallbackResult> {
  let stateCookie = '';
  try {
    stateCookie = window.sessionStorage.getItem(STATE_KEY) ?? '';
  } catch {
    // ignore
  }
  try {
    const r = await api.post('/auth/google/callback', { code, state, stateCookie });
    const data = r.data?.data ?? {};
    const at = data.tokens?.accessToken;
    const rt = data.tokens?.refreshToken;
    if (!at || !rt || !data.user) {
      throw new Error('Sign-in did not return a session');
    }
    authStore.getState().loginSuccess(at, rt, data.user);
    const target = await landingPathAfterAuth(data.user);
    return { redirectTo: target };
  } catch (err) {
    throw new Error(extractError(err).message);
  } finally {
    try {
      window.sessionStorage.removeItem(STATE_KEY);
    } catch {
      // ignore
    }
  }
}
