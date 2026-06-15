import type { Request, Response } from 'express';
import {
  registerUser,
  loginUser,
  refreshSession,
  logout,
  startPasswordReset,
  completePasswordReset,
  getMe,
  updateMe,
  deleteMe,
  verifyEmail,
  resendEmailVerification,
} from '../services/auth.service';
import { auditFromReq } from '../services/audit.service';
import { getStorageService } from '../services/storage.service';
import {
  buildGoogleAuthUrl,
  signInWithGoogleCode,
} from '../services/google-oauth.service';
import { AppError } from '../utils/AppError';
import { ok, created } from '../utils/response';
import asyncHandler from '../utils/asyncHandler';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const session = await registerUser({
    ...req.body,
    ipAddress: req.ip,
    userAgent: req.get('user-agent') || undefined,
  });
  await auditFromReq(req, {
    action: 'auth.register',
    targetType: 'user',
    targetId: session.user.id,
    actorId: session.user.id,
  });
  created(res, session);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const session = await loginUser({
    ...req.body,
    ipAddress: req.ip,
    userAgent: req.get('user-agent') || undefined,
  });
  await auditFromReq(req, {
    action: 'auth.login',
    targetType: 'user',
    targetId: session.user.id,
    actorId: session.user.id,
  });
  ok(res, session);
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const session = await refreshSession(
    req.body.refreshToken,
    req.ip,
    req.get('user-agent') || undefined,
  );
  ok(res, session);
});

export const logoutHandler = asyncHandler(async (req: Request, res: Response) => {
  await logout(req.body.refreshToken);
  if (req.user) {
    await auditFromReq(req, { action: 'auth.logout', targetType: 'user', targetId: req.user._id });
  }
  ok(res, { success: true });
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  await startPasswordReset({ email: req.body.email });
  // Always 200, regardless of whether the email exists.
  ok(res, { success: true });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  await completePasswordReset({ token: req.body.token, newPassword: req.body.newPassword });
  ok(res, { success: true });
});

export const verifyEmailHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = await verifyEmail({ email: req.body.email, code: req.body.code });
  await auditFromReq(req, { action: 'auth.verifyEmail', targetType: 'user', targetId: user.id });
  ok(res, { user });
});

export const resendVerificationHandler = asyncHandler(async (req: Request, res: Response) => {
  await resendEmailVerification({ email: req.body.email });
  // Always 200 so we don't leak existence/state.
  ok(res, { success: true });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  const data = await getMe(req.user);
  ok(res, data);
});

export const patchMe = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  const updated = await updateMe(req.user, req.body);
  ok(res, updated);
});

// GET /api/v1/auth/google — returns the Google consent URL + a CSRF state
// token. Browser stores the state, redirects to url, and the callback
// (POST /auth/google/callback) re-asserts it.
export const googleStart = asyncHandler(async (_req: Request, res: Response) => {
  const { url, state } = buildGoogleAuthUrl();
  ok(res, { url, state });
});

// POST /api/v1/auth/google/callback
// Body: { code: string, state: string, stateCookie?: string }
// stateCookie is the state the browser saved before the redirect — it MUST
// equal `state` (the one Google echoed back) or we reject.
export const googleCallback = asyncHandler(async (req: Request, res: Response) => {
  const code = typeof req.body?.code === 'string' ? req.body.code : '';
  const state = typeof req.body?.state === 'string' ? req.body.state : '';
  const stateCookie =
    typeof req.body?.stateCookie === 'string' ? req.body.stateCookie : '';
  if (!code) throw AppError.invalidInput('Missing "code" from Google callback');
  if (!state || !stateCookie || state !== stateCookie) {
    throw AppError.invalidInput('OAuth state mismatch — restart sign-in');
  }
  const { session, isNew } = await signInWithGoogleCode(code, {
    ipAddress: req.ip,
    userAgent: req.get('user-agent') || undefined,
  });
  await auditFromReq(req, {
    action: isNew ? 'auth.google.register' : 'auth.google.login',
    targetType: 'user',
    targetId: session.user.id,
    actorId: session.user.id,
  });
  ok(res, session);
});

// POST /api/v1/auth/me/photo — multipart upload field "file". Hands the buffer
// to the StorageService (Cloudinary in production, local disk in dev) and
// persists the returned URL onto users.photoUrl, returning the updated user.
export const uploadMyPhoto = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  const file = req.file;
  if (!file) throw AppError.invalidInput('No file uploaded — expected multipart field "file"');
  const stored = await getStorageService().put({
    buffer: file.buffer,
    originalName: file.originalname,
    mimeType: file.mimetype,
    folder: 'profiles',
  });
  const updated = await updateMe(req.user, { photoUrl: stored.url });
  ok(res, { user: updated, photo: stored });
});

export const deleteMeHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  const result = await deleteMe(req.user);
  await auditFromReq(req, {
    action: 'auth.delete',
    targetType: 'user',
    targetId: req.user._id,
    metadata: { scheduledDeletionAt: result.scheduledDeletionAt.toISOString() },
  });
  ok(res, { scheduledDeletionAt: result.scheduledDeletionAt });
});
