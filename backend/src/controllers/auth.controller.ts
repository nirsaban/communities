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
