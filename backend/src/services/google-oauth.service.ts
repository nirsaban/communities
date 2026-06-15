import crypto from 'crypto';
import { User, IUser } from '../models/User';
import { AppError } from '../utils/AppError';
import { buildSession, AuthSession } from './auth.service';
import env from '../config/env';

// Google OAuth 2.0 — Authorization Code flow.
//
// We deliberately stay on raw fetch instead of pulling in `google-auth-library`
// because the flow only touches two endpoints and one JWT decode. The
// id_token is trusted without JWKS verification for v1 because it comes
// directly from oauth2.googleapis.com over TLS in response to an authenticated
// request that includes our client_secret — any tampering would have to defeat
// TLS. A follow-up should swap in jose's JWKS verifier for defence-in-depth.

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

function ensureConfigured(): {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
} {
  const clientId = env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = env.GOOGLE_OAUTH_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw AppError.invalidInput(
      'Google sign-in is not configured on this server (missing GOOGLE_OAUTH_*)',
    );
  }
  return { clientId, clientSecret, redirectUri };
}

export interface GoogleAuthUrl {
  url: string;
  state: string;
}

/**
 * Build the Google consent URL the browser should be redirected to. `state`
 * is a 32-byte random hex token the client stores in sessionStorage and is
 * echoed back in the callback to defeat CSRF.
 */
export function buildGoogleAuthUrl(): GoogleAuthUrl {
  const { clientId, redirectUri } = ensureConfigured();
  const state = crypto.randomBytes(16).toString('hex');
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    // openid + email + profile gets us a verified email and the display name.
    scope: 'openid email profile',
    access_type: 'online',
    include_granted_scopes: 'true',
    prompt: 'select_account',
    state,
  });
  return { url: `${AUTH_URL}?${params.toString()}`, state };
}

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  id_token: string;
  token_type: string;
  scope?: string;
}

interface GoogleIdTokenClaims {
  sub: string; // Google's stable user id
  email: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  iss: string;
  aud: string | string[];
  iat: number;
  exp: number;
}

function decodeIdToken(idToken: string): GoogleIdTokenClaims {
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw AppError.invalidInput('Malformed Google id_token');
  }
  try {
    const payload = Buffer.from(parts[1], 'base64url').toString('utf8');
    return JSON.parse(payload) as GoogleIdTokenClaims;
  } catch {
    throw AppError.invalidInput('Could not parse Google id_token payload');
  }
}

export interface SignInWithGoogleResult {
  session: AuthSession;
  isNew: boolean;
}

/**
 * Exchange the auth code Google handed back via the callback URL for a
 * session. If a user with this email already exists they're signed in;
 * otherwise a new account is provisioned (no password — they always
 * sign in via Google going forward, but they can still set a password
 * later via /forgot-password if they want a fallback).
 */
export async function signInWithGoogleCode(
  code: string,
  opts: { ipAddress?: string; userAgent?: string } = {},
): Promise<SignInWithGoogleResult> {
  const { clientId, clientSecret, redirectUri } = ensureConfigured();

  // 1. Exchange code → tokens.
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });
  const tokenRes = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    throw AppError.invalidInput(`Google token exchange failed: ${text.slice(0, 240)}`);
  }
  const tokens = (await tokenRes.json()) as GoogleTokenResponse;
  if (!tokens.id_token) {
    throw AppError.invalidInput('Google did not return an id_token');
  }

  // 2. Pull profile from the id_token claims.
  const claims = decodeIdToken(tokens.id_token);
  if (claims.aud !== clientId) {
    throw AppError.invalidInput('Google id_token audience mismatch');
  }
  if (claims.exp * 1000 < Date.now()) {
    throw AppError.invalidInput('Google id_token has expired');
  }
  if (!claims.email_verified) {
    throw AppError.invalidInput('Google account email is not verified');
  }

  // 3. Find or create the user.
  const email = claims.email.toLowerCase().trim();
  let user: IUser | null = await User.findOne({ email });
  let isNew = false;
  if (!user) {
    user = await User.create({
      email,
      // No password — they're a Google-only user. passwordHash is required by
      // the schema, so we stash a long random unguessable string. They can
      // later use /forgot-password to set a real password if they want a
      // non-Google fallback login.
      passwordHash: crypto.randomBytes(32).toString('hex'),
      name: claims.name ?? claims.given_name ?? '',
      photoUrl: claims.picture,
      emailVerifiedAt: new Date(),
      // Profile is "complete" the moment Google hands us a name.
      onboarding: claims.name
        ? { profileCompletedAt: new Date() }
        : undefined,
    });
    isNew = true;
  } else {
    if (user.status === 'disabled') {
      throw AppError.unauthorized('Account disabled');
    }
    // Backfill anything we didn't have. Never overwrite a name the user
    // already chose — Google's display name can differ from their preferred
    // in-app name.
    let dirty = false;
    if (!user.name && claims.name) {
      user.name = claims.name;
      dirty = true;
    }
    if (!user.photoUrl && claims.picture) {
      user.photoUrl = claims.picture;
      dirty = true;
    }
    if (!user.emailVerifiedAt) {
      user.emailVerifiedAt = new Date();
      dirty = true;
    }
    if (user.name && !user.onboarding?.profileCompletedAt) {
      user.onboarding = user.onboarding ?? {};
      user.onboarding.profileCompletedAt = new Date();
      dirty = true;
    }
    user.lastLoginAt = new Date();
    if (dirty) await user.save();
    else await user.save(); // touches lastLoginAt
  }

  const session = await buildSession(user, opts.ipAddress, opts.userAgent);
  return { session, isNew };
}
