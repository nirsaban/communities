import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { User, IUser, SafeUser } from '../models/User';
import { Membership } from '../models/Membership';
import { RefreshToken } from '../models/RefreshToken';
import { AppError } from '../utils/AppError';
import { toClientRole } from '../utils/role';
import { getMailService } from './mail.service';
import env from '../config/env';
import {
  signAccessToken,
  issueRefreshToken,
  consumeRefreshToken,
  revokeRefreshToken,
} from './token.service';

/// 30-day grace before background purge per PRD 02 §3.5.
const ACCOUNT_DELETE_GRACE_DAYS = 30;

const BCRYPT_COST = 12;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

export interface AuthSession {
  user: SafeUser;
  tokens: AuthTokens;
}

export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
  ipAddress?: string;
  userAgent?: string;
}

export async function registerUser(input: RegisterInput): Promise<AuthSession> {
  const email = input.email.toLowerCase().trim();
  const existing = await User.findOne({ email }).lean();
  if (existing) {
    throw AppError.conflict('Email already registered');
  }
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
  const user = await User.create({
    email,
    passwordHash,
    name: input.name?.trim() || '',
  });
  await issueEmailVerificationCode(user);
  await markLogin(user, input.ipAddress, input.userAgent);
  return buildSession(user, input.ipAddress, input.userAgent);
}

function generateVerificationCode(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

async function issueEmailVerificationCode(user: IUser): Promise<void> {
  const code = generateVerificationCode();
  const hash = crypto.createHash('sha256').update(code).digest('hex');
  const expiresAt = new Date(Date.now() + env.EMAIL_VERIFICATION_TTL_MINUTES * 60 * 1000);
  user.emailVerificationCodeHash = hash;
  user.emailVerificationExpiresAt = expiresAt;
  await user.save();

  await getMailService().send({
    to: user.email,
    subject: 'Verify your email',
    text:
      `Your verification code is ${code}.\n` +
      `It expires in ${env.EMAIL_VERIFICATION_TTL_MINUTES} minutes.`,
    template: 'email-verification',
    data: { code, expiresAt: expiresAt.toISOString() },
  });
}

export interface VerifyEmailInput {
  email: string;
  code: string;
}

export async function verifyEmail(input: VerifyEmailInput): Promise<SafeUser> {
  const email = input.email.toLowerCase().trim();
  const user = await User.findOne({ email }).select(
    '+emailVerificationCodeHash +emailVerificationExpiresAt',
  );
  if (!user) {
    throw AppError.invalidInput('Invalid or expired verification code');
  }
  if (user.emailVerifiedAt) {
    return user.toSafeJSON();
  }
  const hash = crypto.createHash('sha256').update(input.code).digest('hex');
  const expired =
    !user.emailVerificationExpiresAt || user.emailVerificationExpiresAt.getTime() < Date.now();
  if (user.emailVerificationCodeHash !== hash || expired) {
    throw AppError.invalidInput('Invalid or expired verification code');
  }
  user.emailVerifiedAt = new Date();
  user.emailVerificationCodeHash = undefined;
  user.emailVerificationExpiresAt = undefined;
  await user.save();
  return user.toSafeJSON();
}

export interface ResendVerificationInput {
  email: string;
}

export async function resendEmailVerification(input: ResendVerificationInput): Promise<void> {
  const email = input.email.toLowerCase().trim();
  const user = await User.findOne({ email });
  // Do not leak which emails exist or whether already verified.
  if (!user || user.emailVerifiedAt) return;
  await issueEmailVerificationCode(user);
}

export interface LoginInput {
  email: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}

export async function loginUser(input: LoginInput): Promise<AuthSession> {
  const email = input.email.toLowerCase().trim();
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !user.passwordHash) {
    // Avoid leaking existence.
    throw AppError.unauthenticated('Invalid email or password');
  }
  if (user.status === 'disabled') {
    throw AppError.unauthorized('Account disabled');
  }
  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) {
    throw AppError.unauthenticated('Invalid email or password');
  }
  await markLogin(user, input.ipAddress, input.userAgent);
  return buildSession(user, input.ipAddress, input.userAgent);
}

export async function refreshSession(
  refreshToken: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<AuthSession> {
  const { userId, tokenDoc } = await consumeRefreshToken(refreshToken);
  const user = await User.findById(userId);
  if (!user) throw AppError.unauthenticated('User no longer exists');
  if (user.status === 'disabled') throw AppError.unauthorized('Account disabled');

  const accessToken = signAccessToken(user);
  const issued = await issueRefreshToken(userId, {
    ipAddress,
    userAgent,
    replacesTokenDoc: tokenDoc,
  });
  return {
    user: user.toSafeJSON(),
    tokens: {
      accessToken,
      refreshToken: issued.token,
      refreshExpiresAt: issued.expiresAt,
    },
  };
}

export async function logout(refreshToken: string | undefined): Promise<void> {
  if (!refreshToken) return;
  await revokeRefreshToken(refreshToken);
}

export interface ForgotPasswordInput {
  email: string;
}

export async function startPasswordReset(input: ForgotPasswordInput): Promise<void> {
  const email = input.email.toLowerCase().trim();
  const user = await User.findOne({ email });
  // Do not leak which emails exist.
  if (!user) return;

  const rawToken = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + env.PASSWORD_RESET_TTL_MINUTES * 60 * 1000);
  user.passwordResetTokenHash = hash;
  user.passwordResetExpiresAt = expiresAt;
  await user.save();

  await getMailService().send({
    to: email,
    subject: 'Reset your password',
    text:
      `Use this token to reset your password (valid for ${env.PASSWORD_RESET_TTL_MINUTES} minutes):\n\n` +
      `${rawToken}\n\n` +
      `Or open: ${env.API_BASE_URL}/reset-password?token=${rawToken}`,
    template: 'password-reset',
    data: { resetToken: rawToken, expiresAt: expiresAt.toISOString() },
  });
}

export interface ResetPasswordInput {
  token: string;
  newPassword: string;
}

export async function completePasswordReset(input: ResetPasswordInput): Promise<void> {
  const hash = crypto.createHash('sha256').update(input.token).digest('hex');
  const user = await User.findOne({
    passwordResetTokenHash: hash,
    passwordResetExpiresAt: { $gt: new Date() },
  }).select('+passwordResetTokenHash +passwordResetExpiresAt');
  if (!user) {
    throw AppError.invalidInput('Invalid or expired reset token');
  }
  user.passwordHash = await bcrypt.hash(input.newPassword, BCRYPT_COST);
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpiresAt = undefined;
  await user.save();
}

export interface UpdateMeInput {
  name?: string;
  bio?: string;
  photoUrl?: string;
  interests?: string[];
}

export async function updateMe(user: IUser, input: UpdateMeInput): Promise<SafeUser> {
  if (input.name !== undefined) user.name = input.name;
  if (input.bio !== undefined) user.bio = input.bio;
  if (input.photoUrl !== undefined) user.photoUrl = input.photoUrl;
  if (input.interests !== undefined) user.interests = input.interests;
  await user.save();
  return user.toSafeJSON();
}

export async function getMe(user: IUser): Promise<{
  user: SafeUser;
  memberships: Array<Record<string, unknown>>;
}> {
  const memberships = await Membership.find({ userId: user._id, status: 'active' }).lean();
  return {
    user: user.toSafeJSON(),
    memberships: memberships.map((m) => ({
      id: String(m._id),
      communityId: String(m.communityId),
      role: toClientRole(m.role),
      status: m.status,
      joinedAt: m.joinedAt,
    })),
  };
}

async function markLogin(user: IUser, _ip?: string, _ua?: string): Promise<void> {
  user.lastLoginAt = new Date();
  await user.save();
}

export async function deleteMe(user: IUser): Promise<{ scheduledDeletionAt: Date }> {
  const scheduledAt = new Date(Date.now() + ACCOUNT_DELETE_GRACE_DAYS * 24 * 60 * 60 * 1000);
  user.status = 'disabled';
  user.scheduledDeletionAt = scheduledAt;
  await user.save();
  // Revoke every outstanding refresh token so any other device gets logged out.
  await RefreshToken.updateMany(
    { userId: user._id, revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date() } },
  );
  return { scheduledDeletionAt: scheduledAt };
}

export async function buildSession(
  user: IUser,
  ipAddress?: string,
  userAgent?: string,
): Promise<AuthSession> {
  const accessToken = signAccessToken(user);
  const issued = await issueRefreshToken(String(user._id), { ipAddress, userAgent });
  return {
    user: user.toSafeJSON(),
    tokens: {
      accessToken,
      refreshToken: issued.token,
      refreshExpiresAt: issued.expiresAt,
    },
  };
}
