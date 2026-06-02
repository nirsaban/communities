import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import asyncHandler from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { ok, created } from '../utils/response';
import { Community } from '../models/Community';
import { Membership } from '../models/Membership';
import { parsePagination, cursorFilter, nextCursorFor } from '../utils/pagination';

// GET /api/v1/discovery/communities
// Returns active, public/application communities the caller is not already a member of.
export const listCommunities = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  const { limit, cursor } = parsePagination({
    limit: req.query.limit as string | number | undefined,
    cursor: req.query.cursor as string | undefined,
  });
  const q = (req.query.q as string | undefined)?.trim();

  const myMemberships = await Membership.find({ userId: req.user._id }).select('communityId').lean();
  const excludedIds = myMemberships.map((m) => m.communityId);

  const filter: Record<string, unknown> = {
    status: 'active',
    privacy: { $in: ['public', 'application'] },
    deletedAt: null,
    _id: { $nin: excludedIds },
  };
  if (q && q.length > 0) {
    filter.name = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  }
  Object.assign(filter, cursorFilter(cursor));

  const rows = await Community.find(filter).sort({ createdAt: -1, _id: -1 }).limit(limit + 1);
  const items = rows.slice(0, limit);
  const next =
    rows.length > limit
      ? nextCursorFor(items as unknown as { createdAt: Date; _id: mongoose.Types.ObjectId }[])
      : null;
  ok(
    res,
    items.map((c) => ({
      id: String(c._id),
      name: c.name,
      slug: c.slug,
      description: c.description,
      category: c.category,
      logoUrl: c.logoUrl,
      coverUrl: c.coverUrl,
      privacy: c.privacy,
      memberCount: c.metrics.memberCount,
      eventCount: c.metrics.eventCount,
    })),
    { nextCursor: next },
  );
});

// POST /api/v1/discovery/communities/:cid/join
// Public communities only. Creates an active member-role membership instantly.
export const joinCommunity = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  if (!mongoose.Types.ObjectId.isValid(req.params.cid)) {
    throw AppError.notFound('Community not found');
  }
  const community = await Community.findById(req.params.cid);
  if (!community || community.status !== 'active') throw AppError.notFound('Community not found');
  if (community.privacy !== 'public') {
    throw AppError.unauthorized('This community requires an application or invitation');
  }
  const existing = await Membership.findOne({ userId: req.user._id, communityId: community._id });
  if (existing) {
    ok(res, existing.toClientJSON());
    return;
  }
  const membership = await Membership.create({
    userId: req.user._id,
    communityId: community._id,
    role: 'member',
    status: 'active',
    joinedAt: new Date(),
  });
  community.metrics.memberCount = (community.metrics.memberCount ?? 0) + 1;
  await community.save();
  created(res, membership.toClientJSON());
});

// POST /api/v1/discovery/communities/:cid/request
// Application communities. Creates a pending membership; admin approves later.
export const requestJoinCommunity = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  if (!mongoose.Types.ObjectId.isValid(req.params.cid)) {
    throw AppError.notFound('Community not found');
  }
  const community = await Community.findById(req.params.cid);
  if (!community || community.status !== 'active') throw AppError.notFound('Community not found');
  if (community.privacy !== 'application') {
    throw AppError.invalidInput('This community does not accept join requests');
  }
  const existing = await Membership.findOne({ userId: req.user._id, communityId: community._id });
  if (existing) {
    ok(res, existing.toClientJSON());
    return;
  }
  const membership = await Membership.create({
    userId: req.user._id,
    communityId: community._id,
    role: 'member',
    status: 'pending',
    joinedAt: new Date(),
  });
  created(res, membership.toClientJSON());
});
