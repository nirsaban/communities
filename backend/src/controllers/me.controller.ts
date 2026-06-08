import type { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { ok } from '../utils/response';
import { EventRSVP } from '../models/EventRSVP';
import { EventModel } from '../models/Event';
import { Membership } from '../models/Membership';
import { Community } from '../models/Community';
import { defaultPrivacyPreferences, type IPrivacyPreferences } from '../models/User';
import { toClientRole } from '../utils/role';

// GET /api/v1/me/rsvps?bucket=upcoming|past&limit=
// Lists the caller's RSVPs joined with the source event so the client can render
// MyRSVPs without a per-row second lookup. Sorted by event start (asc for
// upcoming, desc for past).
export const listMyRsvps = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  const bucket = (req.query.bucket as string | undefined) ?? 'upcoming';
  const limit = Math.min(Number(req.query.limit ?? 50), 100);

  const rsvps = await EventRSVP.find({
    userId: req.user._id,
    status: { $in: ['going', 'waitlist'] },
  })
    .lean();

  if (rsvps.length === 0) {
    ok(res, []);
    return;
  }

  const eventIds = rsvps.map((r) => r.eventId);
  const events = await EventModel.find({ _id: { $in: eventIds } }).lean();
  const byId = new Map(events.map((e) => [String(e._id), e]));

  const now = new Date();
  const joined = rsvps
    .map((r) => ({ rsvp: r, event: byId.get(String(r.eventId)) }))
    .filter((row) => row.event != null);

  const filtered = joined.filter(({ event }) => {
    if (!event) return false;
    const past = new Date(event.endAt) < now;
    return bucket === 'past' ? past : !past;
  });

  filtered.sort((a, b) => {
    const ax = new Date(a.event!.startAt).getTime();
    const bx = new Date(b.event!.startAt).getTime();
    return bucket === 'past' ? bx - ax : ax - bx;
  });

  ok(
    res,
    filtered.slice(0, limit).map(({ rsvp, event }) => ({
      id: String(rsvp._id),
      status: rsvp.status,
      paymentStatus: rsvp.paymentStatus,
      createdAt: rsvp.createdAt,
      event: {
        id: String(event!._id),
        communityId: String(event!.communityId),
        title: event!.title,
        startAt: event!.startAt,
        endAt: event!.endAt,
        coverImageUrl: event!.coverImageUrl,
        location: event!.location,
        pricing: event!.pricing,
        status: event!.status,
        capacity: event!.capacity,
        metrics: event!.metrics,
      },
    })),
  );
});

// GET /api/v1/me/communities — the caller's memberships with embedded community.
// Used by CommunitySwitcher.
export const listMyCommunities = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  const memberships = await Membership.find({
    userId: req.user._id,
    status: 'active',
  }).lean();
  if (memberships.length === 0) {
    ok(res, []);
    return;
  }
  const communityIds = memberships.map((m) => m.communityId);
  const communities = await Community.find({ _id: { $in: communityIds } }).lean();
  const byId = new Map(communities.map((c) => [String(c._id), c]));
  ok(
    res,
    memberships.map((m) => {
      const c = byId.get(String(m.communityId));
      return {
        membership: {
          id: String(m._id),
          role: toClientRole(m.role),
          status: m.status,
          joinedAt: m.joinedAt,
        },
        community: c
          ? {
              id: String(c._id),
              name: c.name,
              slug: c.slug,
              logoUrl: c.logoUrl,
              coverUrl: c.coverUrl,
              memberCount: c.metrics.memberCount,
              status: c.status,
              onboarding: {
                wizardCompletedAt: c.onboarding?.wizardCompletedAt ?? null,
              },
            }
          : null,
      };
    }),
  );
});

// GET /api/v1/me/managed-events?bucket=upcoming|past
// Events the caller can manage: assigned as event_manager OR admin/subadmin/superadmin
// of the host community.
export const listMyManagedEvents = asyncHandler(async (req, res) => {
  if (!req.user) throw AppError.unauthenticated();
  const bucket = (req.query.bucket as string | undefined) ?? 'upcoming';
  const limit = Math.min(Number(req.query.limit ?? 50), 100);

  const managedCommunityIds: unknown[] = [];
  if (req.user.globalRole === 'superadmin') {
    const all = await Community.find({ status: 'active' }).select('_id').lean();
    for (const c of all) managedCommunityIds.push(c._id);
  } else {
    const mems = await Membership.find({
      userId: req.user._id,
      status: 'active',
      role: { $in: ['admin', 'subadmin'] },
    })
      .select('communityId')
      .lean();
    for (const m of mems) managedCommunityIds.push(m.communityId);
  }

  const now = new Date();
  const timeFilter = bucket === 'past' ? { endAt: { $lt: now } } : { endAt: { $gte: now } };
  const events = await EventModel.find({
    status: { $in: ['published', 'completed', 'cancelled'] },
    $or: [
      { managers: req.user._id },
      ...(managedCommunityIds.length ? [{ communityId: { $in: managedCommunityIds } }] : []),
    ],
    ...timeFilter,
  })
    .sort({ startAt: bucket === 'past' ? -1 : 1 })
    .limit(limit);

  ok(res, events.map((e) => e.toClientJSON()));
});

// Spread of a Mongoose subdocument leaks internals ($__, _doc, etc) — copy
// each field explicitly to keep the response a plain object.
function serializePrivacy(stored: IPrivacyPreferences | undefined): IPrivacyPreferences {
  const d = defaultPrivacyPreferences();
  if (!stored) return d;
  return {
    profileVisibility: stored.profileVisibility ?? d.profileVisibility,
    showAttendedEvents:
      typeof stored.showAttendedEvents === 'boolean' ? stored.showAttendedEvents : d.showAttendedEvents,
    showInitiativesSupported:
      typeof stored.showInitiativesSupported === 'boolean'
        ? stored.showInitiativesSupported
        : d.showInitiativesSupported,
    allowMentions:
      typeof stored.allowMentions === 'boolean' ? stored.allowMentions : d.allowMentions,
  };
}

// GET /api/v1/me/privacy — read caller's privacy preferences.
export const getPrivacy = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  ok(res, { privacy: serializePrivacy(req.user.privacy) });
});

// PATCH /api/v1/me/privacy — merge in any subset of allowed keys.
export const updatePrivacy = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  const incoming = req.body as Partial<IPrivacyPreferences> | undefined;
  if (!incoming || typeof incoming !== 'object') {
    throw AppError.invalidInput('privacy object required');
  }
  const current = serializePrivacy(req.user.privacy);
  if (
    incoming.profileVisibility === 'public' ||
    incoming.profileVisibility === 'members_only' ||
    incoming.profileVisibility === 'private'
  ) {
    current.profileVisibility = incoming.profileVisibility;
  }
  if (typeof incoming.showAttendedEvents === 'boolean') {
    current.showAttendedEvents = incoming.showAttendedEvents;
  }
  if (typeof incoming.showInitiativesSupported === 'boolean') {
    current.showInitiativesSupported = incoming.showInitiativesSupported;
  }
  if (typeof incoming.allowMentions === 'boolean') {
    current.allowMentions = incoming.allowMentions;
  }
  req.user.privacy = current;
  await req.user.save();
  ok(res, { privacy: current });
});
// (AppError import added next to existing imports.)

