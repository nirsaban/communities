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
//
// When ?recommended=1 is set, results are ranked by overlap between the
// caller's `users.interests` and the community's name/description/category —
// PRD 07 §4.1 "Communities for you". Communities with zero overlap are still
// returned but sorted to the bottom so the rail never goes empty.
export const listCommunities = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  const { limit, cursor } = parsePagination({
    limit: req.query.limit as string | number | undefined,
    cursor: req.query.cursor as string | undefined,
  });
  const q = (req.query.q as string | undefined)?.trim();
  const recommended =
    req.query.recommended === '1' || req.query.recommended === 'true';

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

  // Recommendation mode pulls a wider window than `limit` (we still cap at
  // 50 to keep the score loop cheap) then re-sorts in memory by interest
  // overlap before truncating back to `limit`.
  const fetchLimit = recommended ? Math.max(limit + 1, 50) : limit + 1;
  const rows = await Community.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(fetchLimit);

  let ranked = rows.slice(0, recommended ? rows.length : limit);
  if (recommended) {
    const interests = (req.user.interests ?? []).map((i) => i.toLowerCase()).filter(Boolean);
    const score = (c: typeof rows[number]): number => {
      if (interests.length === 0) return 0;
      const hay = `${c.name} ${c.description ?? ''} ${c.category ?? ''}`.toLowerCase();
      let s = 0;
      for (const i of interests) {
        if (!i) continue;
        if (hay.includes(i)) s += 2;
        // tokenised partial match — pick up "Yoga" against "yoga retreats"
        const tokens = i.split(/[\s/&-]+/);
        for (const tok of tokens) {
          if (tok.length >= 4 && hay.includes(tok)) s += 1;
        }
      }
      return s;
    };
    ranked = [...ranked].sort((a, b) => score(b) - score(a)).slice(0, limit);
  }

  const items = ranked;
  const next =
    !recommended && rows.length > limit
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
