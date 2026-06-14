import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import asyncHandler from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { ok, noContent } from '../utils/response';
import { auditFromReq } from '../services/audit.service';
import { Membership } from '../models/Membership';
import { Community } from '../models/Community';
import { EventModel } from '../models/Event';
import { EventRSVP } from '../models/EventRSVP';
import { Post } from '../models/Post';
import { Initiative } from '../models/Initiative';
import { User } from '../models/User';
import { Notification } from '../models/Notification';
import { Subscription } from '../models/Subscription';
import { getNotificationService } from '../services/notification.service';

function communityIdFromReq(req: Request): mongoose.Types.ObjectId {
  if (!req.membership) throw AppError.unauthorized();
  return req.membership.communityId;
}

// GET /api/v1/communities/:cid/admin/overview
// Engagement-only dashboard. Revenue intentionally absent — covered by /finances (admin).
export const overview = asyncHandler(async (req: Request, res: Response) => {
  const cid = communityIdFromReq(req);
  const now = new Date();
  const [members, upcoming, pending, hiddenPosts, pendingInitiatives] = await Promise.all([
    Membership.countDocuments({ communityId: cid, status: 'active' }),
    EventModel.countDocuments({ communityId: cid, status: 'published', endAt: { $gte: now } }),
    Membership.countDocuments({ communityId: cid, status: 'pending' }),
    Post.countDocuments({ communityId: cid, hidden: true }),
    Initiative.countDocuments({ communityId: cid, status: { $in: ['submitted', 'under_review'] } }),
  ]);
  ok(res, {
    kpis: {
      members,
      upcoming,
      pending,
      flagged: hiddenPosts + pendingInitiatives,
    },
    revenueAvailable: false, // sub-admin guard signal for the UI banner
  });
});

// GET /api/v1/communities/:cid/admin/analytics/attendance
export const attendance = asyncHandler(async (req: Request, res: Response) => {
  const cid = communityIdFromReq(req);
  const now = new Date();
  const events = await EventModel.find({
    communityId: cid,
    endAt: { $lt: now },
    status: { $in: ['published', 'completed'] },
  })
    .sort({ startAt: -1 })
    .limit(20);

  const eventIds = events.map((e) => e._id);
  const rsvps = await EventRSVP.aggregate<{
    _id: mongoose.Types.ObjectId;
    rsvped: number;
    attended: number;
  }>([
    { $match: { eventId: { $in: eventIds }, status: { $in: ['going', 'waitlist'] } } },
    {
      $group: {
        _id: '$eventId',
        rsvped: { $sum: 1 },
        attended: {
          $sum: { $cond: [{ $ifNull: ['$attendedAt', false] }, 1, 0] },
        },
      },
    },
  ]);

  const byId = new Map(rsvps.map((r) => [String(r._id), r]));
  let totalRsvp = 0;
  let totalAttended = 0;
  const series = events.map((e) => {
    const row = byId.get(String(e._id));
    const r = row?.rsvped ?? 0;
    const a = row?.attended ?? 0;
    totalRsvp += r;
    totalAttended += a;
    return {
      eventId: String(e._id),
      title: e.title,
      startAt: e.startAt,
      rsvped: r,
      attended: a,
    };
  });

  const rate = totalRsvp > 0 ? Math.round((totalAttended / totalRsvp) * 100) : 0;
  const sortedByTurnout = [...series].sort((x, y) => {
    const xr = x.rsvped > 0 ? x.attended / x.rsvped : 0;
    const yr = y.rsvped > 0 ? y.attended / y.rsvped : 0;
    return yr - xr;
  });
  ok(res, {
    attendanceRate: rate,
    totalRsvp,
    totalAttended,
    perEvent: series,
    bestTurnout: sortedByTurnout.slice(0, 3),
    worstTurnout: sortedByTurnout.reverse().slice(0, 3),
  });
});

// GET /api/v1/communities/:cid/admin/analytics/growth
export const growth = asyncHandler(async (req: Request, res: Response) => {
  const cid = communityIdFromReq(req);
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 90);
  const byDay = await Membership.aggregate<{
    _id: string;
    joined: number;
  }>([
    {
      $match: {
        communityId: cid,
        joinedAt: { $gte: start },
        status: { $in: ['active', 'pending'] },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$joinedAt' },
        },
        joined: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const total = await Membership.countDocuments({ communityId: cid, status: 'active' });

  // Build cumulative series.
  let running = Math.max(0, total - byDay.reduce((s, r) => s + r.joined, 0));
  const series = byDay.map((r) => {
    running += r.joined;
    return { date: r._id, joined: r.joined, total: running };
  });

  const joined90d = byDay.reduce((s, r) => s + r.joined, 0);
  ok(res, {
    total,
    joined90d,
    left90d: 0, // no leave tracking yet; placeholder so UI doesn't blank
    net90d: joined90d,
    series,
  });
});

// GET /api/v1/communities/:cid/admin/analytics/most-active
export const mostActive = asyncHandler(async (req: Request, res: Response) => {
  const cid = communityIdFromReq(req);
  const rows = await EventRSVP.aggregate<{
    _id: mongoose.Types.ObjectId;
    attended: number;
    rsvped: number;
  }>([
    { $match: { communityId: cid, status: 'going' } },
    {
      $group: {
        _id: '$userId',
        attended: { $sum: { $cond: [{ $ifNull: ['$attendedAt', false] }, 1, 0] } },
        rsvped: { $sum: 1 },
      },
    },
    { $sort: { attended: -1, rsvped: -1 } },
    { $limit: 25 },
  ]);

  const userIds = rows.map((r) => r._id);
  const users = await User.find({ _id: { $in: userIds } }, { name: 1, email: 1, photoUrl: 1 }).lean();
  const map = new Map(users.map((u) => [String(u._id), u]));
  ok(
    res,
    rows.map((r, i) => {
      const u = map.get(String(r._id));
      return {
        rank: i + 1,
        userId: String(r._id),
        name: u?.name ?? '',
        email: u?.email ?? '',
        photoUrl: u?.photoUrl ?? null,
        attended: r.attended,
        rsvped: r.rsvped,
      };
    }),
  );
});

// GET /api/v1/communities/:cid/admin/members/pending
export const pendingMembers = asyncHandler(async (req: Request, res: Response) => {
  const cid = communityIdFromReq(req);
  const rows = await Membership.find({ communityId: cid, status: 'pending' })
    .sort({ joinedAt: -1 })
    .limit(100)
    .lean();
  const userIds = rows.map((r) => r.userId);
  const users = await User.find({ _id: { $in: userIds } }, { name: 1, email: 1, photoUrl: 1, bio: 1 })
    .lean();
  const map = new Map(users.map((u) => [String(u._id), u]));
  ok(
    res,
    rows.map((m) => {
      const u = map.get(String(m.userId));
      return {
        membershipId: String(m._id),
        userId: String(m.userId),
        name: u?.name ?? '',
        email: u?.email ?? '',
        photoUrl: u?.photoUrl ?? null,
        bio: u?.bio ?? null,
        requestedAt: m.joinedAt,
      };
    }),
  );
});

// POST /api/v1/communities/:cid/admin/members/:uid/approve
export const approveMember = asyncHandler(async (req: Request, res: Response) => {
  const cid = communityIdFromReq(req);
  if (!mongoose.Types.ObjectId.isValid(req.params.uid)) {
    throw AppError.notFound('Member not found');
  }
  const m = await Membership.findOne({ communityId: cid, userId: req.params.uid });
  if (!m) throw AppError.notFound('Member not found');
  m.status = 'active';
  m.joinedAt = new Date();
  await m.save();
  await Community.updateOne({ _id: cid }, { $inc: { 'metrics.memberCount': 1 } });
  await auditFromReq(req, {
    action: 'member.approve',
    communityId: cid,
    targetType: 'membership',
    targetId: m._id,
  });
  // HomeFeed promises "we'll send a heads-up" — emit the notification so the
  // applicant lands on /home when they tap.
  try {
    const community = await Community.findById(cid).select('name').lean();
    await getNotificationService().send({
      userId: m.userId,
      communityId: cid,
      type: 'application.approved',
      title: community?.name ? `Welcome to ${community.name}` : 'Application approved',
      body: 'Your request to join was approved. Tap to explore the community.',
      payload: { communityId: String(cid), deepLink: '/home' },
    });
  } catch {
    // Best-effort.
  }
  ok(res, m.toClientJSON());
});

// POST /api/v1/communities/:cid/admin/members/:uid/reject
export const rejectMember = asyncHandler(async (req: Request, res: Response) => {
  const cid = communityIdFromReq(req);
  if (!mongoose.Types.ObjectId.isValid(req.params.uid)) {
    throw AppError.notFound('Member not found');
  }
  const result = await Membership.deleteOne({
    communityId: cid,
    userId: req.params.uid,
    status: 'pending',
  });
  await auditFromReq(req, {
    action: 'member.reject',
    communityId: cid,
    targetType: 'user',
    targetId: req.params.uid,
  });
  // Notify the applicant — deep-link goes back to /discover so they can keep
  // browsing other communities rather than land on a community they can't see.
  if (result.deletedCount > 0) {
    try {
      const community = await Community.findById(cid).select('name').lean();
      await getNotificationService().send({
        userId: req.params.uid,
        communityId: cid,
        type: 'application.rejected',
        title: community?.name
          ? `Application to ${community.name}`
          : 'Application update',
        body: 'Your join request wasn’t approved this time. Explore other communities.',
        payload: { communityId: String(cid), deepLink: '/discover' },
      });
    } catch {
      // Best-effort.
    }
  }
  noContent(res);
});

// GET /api/v1/communities/:cid/admin/members/:uid
export const memberDetail = asyncHandler(async (req: Request, res: Response) => {
  const cid = communityIdFromReq(req);
  if (!mongoose.Types.ObjectId.isValid(req.params.uid)) {
    throw AppError.notFound('Member not found');
  }
  const m = await Membership.findOne({ communityId: cid, userId: req.params.uid });
  if (!m) throw AppError.notFound('Member not found');
  const user = await User.findById(req.params.uid).lean();
  if (!user) throw AppError.notFound('Member not found');
  const [eventsAttended, postsAuthored, initiativesAuthored] = await Promise.all([
    EventRSVP.countDocuments({
      communityId: cid,
      userId: user._id,
      attendedAt: { $exists: true, $ne: null },
    }),
    Post.countDocuments({ communityId: cid, authorId: user._id }),
    Initiative.countDocuments({ communityId: cid, createdBy: user._id }),
  ]);
  ok(res, {
    membership: m.toClientJSON(),
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      photoUrl: user.photoUrl,
      bio: user.bio,
      interests: user.interests,
    },
    activity: {
      eventsAttended,
      postsAuthored,
      initiativesAuthored,
    },
    spendVisible: false, // sub-admin guard signal; admin route will surface a different shape
  });
});

// GET /api/v1/communities/:cid/admin/moderation — recent posts (and any hidden).
// In v1 we don't have a flagging model yet; this surface lets sub-admins act on
// recent + already-hidden content (logged as a deviation for the UI).
// We join the author's name so the UI can render the design's quote card.
export const moderationQueue = asyncHandler(async (req: Request, res: Response) => {
  const cid = communityIdFromReq(req);
  const posts = await Post.find({ communityId: cid })
    .sort({ hidden: -1, createdAt: -1 })
    .limit(50)
    .lean();

  const authorIds = Array.from(new Set(posts.map((p) => String(p.authorId))));
  const authors = await User.find({ _id: { $in: authorIds } })
    .select({ name: 1, email: 1, photoUrl: 1 })
    .lean();
  const authorById = new Map(authors.map((u) => [String(u._id), u]));

  ok(
    res,
    posts.map((p) => {
      const u = authorById.get(String(p.authorId));
      return {
        id: String(p._id),
        authorId: String(p.authorId),
        author: u
          ? {
              id: String(u._id),
              name: u.name ?? 'Member',
              email: u.email ?? null,
              photoUrl: u.photoUrl ?? null,
            }
          : null,
        type: p.type,
        title: p.title,
        body: p.body,
        hidden: !!p.hidden,
        createdAt: p.createdAt,
      };
    }),
  );
});

// POST /api/v1/posts/:pid/moderate   body: { action: 'keep' | 'warn' | 'remove' }
export const moderatePost = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  if (!mongoose.Types.ObjectId.isValid(req.params.pid)) {
    throw AppError.notFound('Post not found');
  }
  const post = await Post.findById(req.params.pid);
  if (!post) throw AppError.notFound('Post not found');
  // Caller must be admin/subadmin of the post's community.
  const membership = await Membership.findOne({
    userId: req.user._id,
    communityId: post.communityId,
    status: 'active',
    role: { $in: ['admin', 'subadmin'] },
  });
  if (!membership && req.user.globalRole !== 'superadmin') {
    throw AppError.unauthorized('Moderator role required');
  }
  const action = String(req.body?.action ?? '');
  if (!['keep', 'warn', 'remove'].includes(action)) {
    throw AppError.invalidInput('action must be keep|warn|remove');
  }
  if (action === 'remove') {
    post.hidden = true;
    post.moderatedAt = new Date();
    post.moderatedByUserId = req.user._id;
  } else if (action === 'keep') {
    post.hidden = false;
    post.moderatedAt = new Date();
    post.moderatedByUserId = req.user._id;
  }
  // 'warn' is logged via audit; no post mutation.
  await post.save();
  await auditFromReq(req, {
    action: `post.moderate.${action}`,
    communityId: post.communityId,
    targetType: 'post',
    targetId: post._id,
  });
  ok(res, post.toClientJSON());
});

// POST /api/v1/events/:eid/broadcast   body: { message, channels?: string[] }
export const broadcastEvent = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  if (!mongoose.Types.ObjectId.isValid(req.params.eid)) {
    throw AppError.notFound('Event not found');
  }
  const event = await EventModel.findById(req.params.eid);
  if (!event) throw AppError.notFound('Event not found');
  // Accept legacy `body` for backward compat; canonical field is `message`.
  const message = String(req.body?.message ?? req.body?.body ?? '').trim();
  if (message.length < 1) throw AppError.invalidInput('message required');
  const rawChannels = Array.isArray(req.body?.channels) ? (req.body.channels as unknown[]) : [];
  const channels = rawChannels
    .map((c) => String(c).toLowerCase())
    .filter((c): c is 'push' | 'inApp' | 'email' =>
      c === 'push' || c === 'inapp' || c === 'in_app' || c === 'email',
    );
  const scheduleAtRaw = typeof req.body?.scheduleAt === 'string' ? req.body.scheduleAt : null;
  const scheduleAt = scheduleAtRaw ? new Date(scheduleAtRaw) : null;

  // Permissions: event manager / community admin / community subadmin / superadmin.
  if (req.user.globalRole !== 'superadmin') {
    const membership = await Membership.findOne({
      userId: req.user._id,
      communityId: event.communityId,
      status: 'active',
    });
    const isManager = event.managers.some((m) => String(m) === String(req.user!._id));
    const isAdmin = membership?.role === 'admin' || membership?.role === 'subadmin';
    if (!isManager && !isAdmin) {
      throw AppError.unauthorized('Not allowed to broadcast');
    }
  }

  const rsvps = await EventRSVP.find({
    eventId: event._id,
    status: { $in: ['going', 'waitlist'] },
  }).select('userId').lean();
  if (rsvps.length === 0) {
    ok(res, { delivered: 0 });
    return;
  }
  const docs = rsvps.map((r) => ({
    userId: r.userId,
    communityId: event.communityId,
    type: 'event_broadcast',
    title: event.title,
    body: message,
    payload: { eventId: String(event._id) },
  }));
  await Notification.insertMany(docs);
  await auditFromReq(req, {
    action: 'event.broadcast',
    communityId: event.communityId,
    targetType: 'event',
    targetId: event._id,
    metadata: {
      delivered: docs.length,
      channels,
      scheduleAt: scheduleAt && !Number.isNaN(scheduleAt.getTime()) ? scheduleAt.toISOString() : null,
    },
  });
  ok(res, {
    delivered: docs.length,
    channels,
    scheduledFor: scheduleAt && !Number.isNaN(scheduleAt.getTime()) ? scheduleAt.toISOString() : null,
  });
});

// GET /api/v1/communities/:cid/admin/subscriptions   (admin only — blocked for sub-admin
// at the route layer via blockSubAdminFromFinancial on the wrapping mount.)
export const listCommunitySubscriptions = asyncHandler(async (req: Request, res: Response) => {
  const cid = communityIdFromReq(req);
  const subs = await Subscription.find({ communityId: cid })
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();
  const userIds = subs.map((s) => s.userId);
  const users = await User.find({ _id: { $in: userIds } }, { name: 1, email: 1, photoUrl: 1 }).lean();
  const byId = new Map(users.map((u) => [String(u._id), u]));
  ok(
    res,
    subs.map((s) => {
      const u = byId.get(String(s.userId));
      return {
        id: String(s._id),
        userId: String(s.userId),
        name: u?.name ?? '',
        email: u?.email ?? '',
        photoUrl: u?.photoUrl ?? null,
        plan: s.plan,
        status: s.status,
        cancelAtPeriodEnd: s.cancelAtPeriodEnd,
        currentPeriodStart: s.currentPeriodStart,
        currentPeriodEnd: s.currentPeriodEnd,
      };
    }),
  );
});
