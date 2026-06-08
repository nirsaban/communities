import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Community } from '../models/Community';
import { User } from '../models/User';
import { Membership } from '../models/Membership';
import { Subscription } from '../models/Subscription';
import { AuditLog } from '../models/AuditLog';
import { AppError } from '../utils/AppError';
import { toClientRole } from '../utils/role';
import { ok, created, noContent } from '../utils/response';
import asyncHandler from '../utils/asyncHandler';
import {
  listCommunitiesForSuper,
  createCommunity,
  getCommunity,
  updateCommunity,
  suspendCommunity,
  restoreCommunity,
  softDeleteCommunity,
} from '../services/community.service';
import { auditFromReq } from '../services/audit.service';

// In-memory platform settings — never persisted. Demo-only stand-in for a real
// PlatformSettings model. Production lives behind feature flags or config service.
const _platformSettings = {
  maintenanceMode: false,
  allowSignups: true,
  paymentGateway: 'payplus',
  payplusKeyMasked: '••••••••••••••••',
};

async function loadById(req: Request) {
  const { cid } = req.params;
  if (!mongoose.Types.ObjectId.isValid(cid)) {
    throw AppError.notFound('Community not found');
  }
  const community = await Community.findById(cid);
  if (!community) throw AppError.notFound('Community not found');
  return community;
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { items, nextCursor } = await listCommunitiesForSuper({
    limit: req.query.limit as number | undefined,
    cursor: req.query.cursor as string | undefined,
    search: req.query.search as string | undefined,
    status: req.query.status as 'active' | 'suspended' | 'deleted' | undefined,
  });
  ok(res, items, { nextCursor });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  const { community, invitation } = await createCommunity(req.user, req.body);
  await auditFromReq(req, {
    action: 'community.create',
    communityId: community._id,
    targetType: 'community',
    targetId: community._id,
    metadata: { initialAdminEmail: req.body.initialAdminEmail },
  });
  created(res, {
    community: community.toClientJSON(),
    invitation: {
      id: String(invitation._id),
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      // Dev convenience: surface the token in the API response.
      // In production this should be removed; the email carries the token.
      token: invitation.token,
    },
  });
});

export const detail = asyncHandler(async (req: Request, res: Response) => {
  const community = await loadById(req);
  const json = await getCommunity(community);
  // Cross-tenant owner lookup: the community admin who originally accepted the
  // bootstrap invite. Shown on the Super CommunityDetailScreen (#75).
  let owner: { id: string; name: string; email: string } | null = null;
  if (community.initialAdminId) {
    const u = await User.findById(community.initialAdminId, { name: 1, email: 1 }).lean();
    if (u) owner = { id: String(u._id), name: u.name, email: u.email };
  }
  if (!owner) {
    // Fallback: any active membership with admin role.
    const m = await Membership.findOne({
      communityId: community._id,
      role: 'admin',
      status: 'active',
    }).lean();
    if (m) {
      const u = await User.findById(m.userId, { name: 1, email: 1 }).lean();
      if (u) owner = { id: String(u._id), name: u.name, email: u.email };
    }
  }
  ok(res, { ...json, owner });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const community = await loadById(req);
  const updated = await updateCommunity(community, req.body);
  await auditFromReq(req, {
    action: 'community.update',
    communityId: community._id,
    targetType: 'community',
    targetId: community._id,
    metadata: { fields: Object.keys(req.body) },
  });
  ok(res, updated.toClientJSON());
});

export const suspend = asyncHandler(async (req: Request, res: Response) => {
  const community = await loadById(req);
  const updated = await suspendCommunity(community);
  await auditFromReq(req, {
    action: 'community.suspend',
    communityId: community._id,
    targetType: 'community',
    targetId: community._id,
  });
  ok(res, updated.toClientJSON());
});

export const restore = asyncHandler(async (req: Request, res: Response) => {
  const community = await loadById(req);
  const updated = await restoreCommunity(community);
  await auditFromReq(req, {
    action: 'community.restore',
    communityId: community._id,
    targetType: 'community',
    targetId: community._id,
  });
  ok(res, updated.toClientJSON());
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const community = await loadById(req);
  const updated = await softDeleteCommunity(community);
  await auditFromReq(req, {
    action: 'community.delete',
    communityId: community._id,
    targetType: 'community',
    targetId: community._id,
  });
  ok(res, updated.toClientJSON());
});

// GET /api/v1/super/stats — platform-wide aggregates for SuperAdminDashboard.
export const stats = asyncHandler(async (_req: Request, res: Response) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const [communities, users, activeSubs, recentLogins] = await Promise.all([
    Community.countDocuments({ status: 'active' }),
    User.countDocuments({ status: 'active' }),
    Subscription.countDocuments({ status: 'active' }),
    User.countDocuments({ lastLoginAt: { $gte: startOfMonth } }),
  ]);
  // MRR proxy = active monthly subs × $12 + active annual subs × $10 (approx).
  const subsByPlan = await Subscription.aggregate<{ _id: string; n: number }>([
    { $match: { status: 'active' } },
    { $group: { _id: '$plan', n: { $sum: 1 } } },
  ]);
  let mrrCents = 0;
  for (const row of subsByPlan) {
    if (row._id === 'monthly') mrrCents += row.n * 12_00;
    else if (row._id === 'annual') mrrCents += row.n * 10_00;
  }
  // 30-day login series for the active-users chart.
  const start = new Date(now);
  start.setDate(start.getDate() - 30);
  const series = await User.aggregate<{ _id: string; n: number }>([
    { $match: { lastLoginAt: { $gte: start } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$lastLoginAt' } },
        n: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  ok(res, {
    kpis: {
      communities,
      users,
      mrrCents,
      activeUsersMtd: recentLogins,
      activeSubs,
    },
    activeUsersSeries: series.map((s) => ({ date: s._id, active: s.n })),
  });
});

// GET /api/v1/super/users?q=&role=&status=
export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const q = (req.query.q as string | undefined)?.trim();
  const status = req.query.status as string | undefined;
  const filter: Record<string, unknown> = {};
  if (q && q.length > 0) {
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { email: { $regex: safe, $options: 'i' } },
      { name: { $regex: safe, $options: 'i' } },
    ];
  }
  if (status === 'disabled' || status === 'active') filter.status = status;
  const rows = await User.find(filter)
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  // Compute membership counts + highest role per user in one aggregate, so the
  // Super list (#77) can render `email · N communities` and a role badge.
  const userIds = rows.map((u) => u._id);
  const membershipAgg = await Membership.aggregate<{
    _id: mongoose.Types.ObjectId;
    count: number;
    roles: string[];
  }>([
    { $match: { userId: { $in: userIds }, status: 'active' } },
    { $group: { _id: '$userId', count: { $sum: 1 }, roles: { $addToSet: '$role' } } },
  ]);
  const byUser = new Map<string, { count: number; roles: string[] }>(
    membershipAgg.map((m) => [String(m._id), { count: m.count, roles: m.roles }]),
  );
  // Highest role wins for the badge. Ordering matches the role hierarchy (DB enum).
  const ROLE_RANK = ['admin', 'subadmin', 'event_manager', 'member'];
  function topRole(roles: string[]): string {
    for (const r of ROLE_RANK) if (roles.includes(r)) return r;
    return 'member';
  }
  ok(
    res,
    rows.map((u) => {
      const m = byUser.get(String(u._id)) ?? { count: 0, roles: [] };
      return {
        id: String(u._id),
        email: u.email,
        name: u.name,
        photoUrl: u.photoUrl ?? null,
        status: u.status,
        globalRole: u.globalRole,
        lastLoginAt: u.lastLoginAt ?? null,
        createdAt: u.createdAt,
        membershipCount: m.count,
        topRole: u.globalRole === 'superadmin' ? 'superadmin' : topRole(m.roles),
      };
    }),
  );
});

// GET /api/v1/super/users/:uid
export const userDetail = asyncHandler(async (req: Request, res: Response) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.uid)) {
    throw AppError.notFound('User not found');
  }
  const user = await User.findById(req.params.uid).lean();
  if (!user) throw AppError.notFound('User not found');
  const memberships = await Membership.find({ userId: user._id }).lean();
  const communityIds = memberships.map((m) => m.communityId);
  const communities = await Community.find(
    { _id: { $in: communityIds } },
    { name: 1, slug: 1, logoUrl: 1, status: 1 },
  ).lean();
  const byId = new Map(communities.map((c) => [String(c._id), c]));
  ok(res, {
    user: {
      id: String(user._id),
      email: user.email,
      name: user.name,
      photoUrl: user.photoUrl ?? null,
      bio: user.bio ?? null,
      status: user.status,
      globalRole: user.globalRole,
      lastLoginAt: user.lastLoginAt ?? null,
      scheduledDeletionAt: user.scheduledDeletionAt ?? null,
      createdAt: user.createdAt,
    },
    memberships: memberships.map((m) => {
      const c = byId.get(String(m.communityId));
      return {
        membershipId: String(m._id),
        communityId: String(m.communityId),
        role: toClientRole(m.role),
        status: m.status,
        joinedAt: m.joinedAt,
        community: c
          ? {
              id: String(c._id),
              name: c.name,
              slug: c.slug,
              logoUrl: c.logoUrl ?? null,
              status: c.status,
            }
          : null,
      };
    }),
  });
});

// POST /api/v1/super/users/:uid/reset-password — kick off a password reset for
// the target user (mirrors the public forgot-password flow but bypasses the
// "do not leak which emails exist" guard since the operator is asking).
export const forcePasswordReset = asyncHandler(async (req: Request, res: Response) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.uid)) {
    throw AppError.notFound('User not found');
  }
  const u = await User.findById(req.params.uid);
  if (!u) throw AppError.notFound('User not found');
  // Lazy import to avoid pulling crypto into the controller for the common path.
  const { startPasswordReset } = await import('../services/auth.service');
  await startPasswordReset({ email: u.email });
  await auditFromReq(req, {
    action: 'user.force_password_reset',
    targetType: 'user',
    targetId: u._id,
  });
  ok(res, { id: String(u._id), emailed: true });
});

// POST /api/v1/super/users/:uid/disable
export const disableUser = asyncHandler(async (req: Request, res: Response) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.uid)) {
    throw AppError.notFound('User not found');
  }
  const u = await User.findById(req.params.uid);
  if (!u) throw AppError.notFound('User not found');
  u.status = 'disabled';
  await u.save();
  await auditFromReq(req, {
    action: 'user.disable',
    targetType: 'user',
    targetId: u._id,
  });
  ok(res, { id: String(u._id), status: u.status });
});

// POST /api/v1/super/users/:uid/promote — flip a user to globalRole='superadmin' (PRD 03 §3.4).
export const promoteUser = asyncHandler(async (req: Request, res: Response) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.uid)) {
    throw AppError.notFound('User not found');
  }
  const u = await User.findById(req.params.uid);
  if (!u) throw AppError.notFound('User not found');
  if (u.globalRole === 'superadmin') {
    ok(res, { id: String(u._id), globalRole: u.globalRole, alreadySuper: true });
    return;
  }
  u.globalRole = 'superadmin';
  await u.save();
  await auditFromReq(req, {
    action: 'user.promote.super',
    targetType: 'user',
    targetId: u._id,
  });
  ok(res, { id: String(u._id), globalRole: u.globalRole });
});

// GET /api/v1/super/audit?limit=&before= — recent audit log entries with light actor join.
export const audit = asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit ?? 50), 200);
  const before = req.query.before ? new Date(String(req.query.before)) : null;
  const filter: Record<string, unknown> = {};
  if (before && !Number.isNaN(before.getTime())) {
    filter.createdAt = { $lt: before };
  }
  const rows = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
  const actorIds = rows.map((r) => r.actorId).filter(Boolean);
  const actors = await User.find({ _id: { $in: actorIds } }, { name: 1, email: 1 }).lean();
  const byId = new Map(actors.map((u) => [String(u._id), u]));
  const items = rows.map((r) => ({
    id: String(r._id),
    action: r.action,
    actor: r.actorId
      ? {
          id: String(r.actorId),
          name: byId.get(String(r.actorId))?.name ?? '',
          email: byId.get(String(r.actorId))?.email ?? '',
        }
      : null,
    actorRole: r.actorRole ?? null,
    communityId: r.communityId ? String(r.communityId) : null,
    targetType: r.targetType ?? null,
    targetId: r.targetId ? String(r.targetId) : null,
    createdAt: r.createdAt,
  }));
  ok(res, items);
});

// POST /api/v1/super/users/:uid/enable
export const enableUser = asyncHandler(async (req: Request, res: Response) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.uid)) {
    throw AppError.notFound('User not found');
  }
  const u = await User.findById(req.params.uid);
  if (!u) throw AppError.notFound('User not found');
  u.status = 'active';
  await u.save();
  await auditFromReq(req, {
    action: 'user.enable',
    targetType: 'user',
    targetId: u._id,
  });
  ok(res, { id: String(u._id), status: u.status });
});

// GET /api/v1/super/settings
export const getPlatformSettings = asyncHandler(async (_req: Request, res: Response) => {
  ok(res, { ..._platformSettings });
});

// PATCH /api/v1/super/settings
export const updatePlatformSettings = asyncHandler(async (req: Request, res: Response) => {
  if (typeof req.body?.maintenanceMode === 'boolean') {
    _platformSettings.maintenanceMode = req.body.maintenanceMode;
  }
  if (typeof req.body?.allowSignups === 'boolean') {
    _platformSettings.allowSignups = req.body.allowSignups;
  }
  await auditFromReq(req, {
    action: 'platform.settings.update',
    targetType: 'platform',
    metadata: { ..._platformSettings },
  });
  ok(res, { ..._platformSettings });
});

// Re-export `noContent` even if unused locally — keeps the file's contract clean.
export const _noContent = noContent;
