import crypto from 'crypto';
import jwt, { SignOptions, Secret } from 'jsonwebtoken';
import env from '../config/env';
import { RefreshToken } from '../models/RefreshToken';
import { AppError } from '../utils/AppError';
import type { GlobalRole, IUser } from '../models/User';

export interface AccessTokenPayload {
  userId: string;
  globalRole: GlobalRole;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
}

const ACCESS_SECRET: Secret = env.JWT_ACCESS_SECRET;
const REFRESH_SECRET: Secret = env.JWT_REFRESH_SECRET;
const ACCESS_TTL: SignOptions['expiresIn'] = env.JWT_ACCESS_TTL as SignOptions['expiresIn'];
const REFRESH_TTL: SignOptions['expiresIn'] = env.JWT_REFRESH_TTL as SignOptions['expiresIn'];

function sha256(s: string): string {
  return crypto.createHash('sha256').update(s).digest('hex');
}

export function signAccessToken(user: Pick<IUser, '_id' | 'globalRole'>): string {
  const payload: AccessTokenPayload = {
    userId: String(user._id),
    globalRole: user.globalRole,
  };
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_TTL });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    return jwt.verify(token, ACCESS_SECRET) as AccessTokenPayload;
  } catch {
    throw AppError.unauthenticated('Invalid or expired access token');
  }
}

interface IssueRefreshOpts {
  ipAddress?: string;
  userAgent?: string;
  replacesTokenDoc?: { _id: import('mongoose').Types.ObjectId } | null;
}

export interface IssuedRefresh {
  token: string;
  tokenDocId: string;
  expiresAt: Date;
}

export async function issueRefreshToken(
  userId: string,
  opts: IssueRefreshOpts = {},
): Promise<IssuedRefresh> {
  const tokenId = crypto.randomBytes(32).toString('hex');
  const tokenHash = sha256(tokenId);

  // Compute absolute expiry once so JWT exp + DB expiresAt agree.
  const ttlSeconds = parseTtlToSeconds(env.JWT_REFRESH_TTL);
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

  const doc = await RefreshToken.create({
    userId,
    tokenHash,
    expiresAt,
    ipAddress: opts.ipAddress,
    userAgent: opts.userAgent,
  });

  if (opts.replacesTokenDoc) {
    await RefreshToken.updateOne(
      { _id: opts.replacesTokenDoc._id },
      { $set: { replacedByTokenId: doc._id } },
    );
  }

  const payload: RefreshTokenPayload = { userId, tokenId };
  const token = jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_TTL });
  return { token, tokenDocId: String(doc._id), expiresAt };
}

export async function consumeRefreshToken(rawToken: string): Promise<{
  userId: string;
  tokenDoc: { _id: import('mongoose').Types.ObjectId };
}> {
  let payload: RefreshTokenPayload;
  try {
    payload = jwt.verify(rawToken, REFRESH_SECRET) as RefreshTokenPayload;
  } catch {
    throw AppError.unauthenticated('Invalid or expired refresh token');
  }
  const tokenHash = sha256(payload.tokenId);
  const doc = await RefreshToken.findOne({ tokenHash });
  if (!doc) {
    // Could indicate a stolen/reused token whose record we already rotated away.
    throw AppError.unauthenticated('Refresh token not recognized');
  }
  if (doc.revokedAt) {
    // Reuse of a revoked token → revoke the entire user's refresh token family
    // (defense against token theft per PRD 02 §7).
    await RefreshToken.updateMany(
      { userId: doc.userId, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } },
    );
    throw AppError.unauthenticated('Refresh token reuse detected; session revoked');
  }
  if (doc.expiresAt < new Date()) {
    throw AppError.unauthenticated('Refresh token expired');
  }
  // Mark consumed; caller will issue a new one and link via replacedByTokenId.
  doc.revokedAt = new Date();
  await doc.save();
  return { userId: String(doc.userId), tokenDoc: { _id: doc._id } };
}

export async function revokeRefreshToken(rawToken: string): Promise<void> {
  try {
    const payload = jwt.verify(rawToken, REFRESH_SECRET) as RefreshTokenPayload;
    const tokenHash = sha256(payload.tokenId);
    await RefreshToken.updateOne(
      { tokenHash, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } },
    );
  } catch {
    // Logout with an invalid token is still a no-op success — don't leak.
  }
}

// "15m" / "30d" / "3600" → seconds.
export function parseTtlToSeconds(ttl: string): number {
  const m = /^(\d+)(ms|s|m|h|d)?$/.exec(ttl);
  if (!m) {
    const asNum = Number(ttl);
    if (Number.isFinite(asNum)) return Math.floor(asNum);
    throw new Error(`Invalid TTL: ${ttl}`);
  }
  const n = parseInt(m[1], 10);
  switch (m[2]) {
    case 'ms':
      return Math.floor(n / 1000);
    case 's':
    case undefined:
      return n;
    case 'm':
      return n * 60;
    case 'h':
      return n * 3600;
    case 'd':
      return n * 86400;
    default:
      throw new Error(`Invalid TTL unit: ${ttl}`);
  }
}

export function hashTokenForLookup(tokenId: string): string {
  return sha256(tokenId);
}
