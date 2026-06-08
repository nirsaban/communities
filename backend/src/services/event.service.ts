import mongoose, { Types } from 'mongoose';
import { EventModel, IEvent } from '../models/Event';
import { EventRSVP, IEventRSVP } from '../models/EventRSVP';
import { Material, IMaterial } from '../models/Material';
import { Membership, CommunityRole } from '../models/Membership';
import { Community } from '../models/Community';
import { AppError } from '../utils/AppError';
import { CreateEventInput, UpdateEventInput, RsvpInput, CreateMaterialInput } from '../validators/event.validator';
import { cursorFilter, nextCursorFor, parsePagination } from '../utils/pagination';
import { getStorageService } from './storage.service';
import { hasActiveSubscription } from './payment.service';
import type { IUser } from '../models/User';

interface ListEventsOpts {
  limit?: number;
  cursor?: string;
  status?: 'draft' | 'published' | 'cancelled' | 'completed';
  from?: Date;
  to?: Date;
}

export async function listEvents(
  communityId: Types.ObjectId,
  viewerRole: CommunityRole | 'super',
  opts: ListEventsOpts,
): Promise<{ items: Record<string, unknown>[]; nextCursor: string | null }> {
  const { limit, cursor } = parsePagination({ limit: opts.limit, cursor: opts.cursor });
  const filter: Record<string, unknown> = { communityId };
  if (opts.status) filter.status = opts.status;
  else if (viewerRole === 'member' || viewerRole === 'event_manager') {
    // Members and event managers don't see drafts.
    filter.status = { $in: ['published', 'completed', 'cancelled'] };
  }
  if (opts.from || opts.to) {
    const range: Record<string, Date> = {};
    if (opts.from) range.$gte = opts.from;
    if (opts.to) range.$lte = opts.to;
    filter.startAt = range;
  }
  Object.assign(filter, cursorFilter(cursor));
  const rows = await EventModel.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1);
  const items = rows.slice(0, limit);
  const next =
    rows.length > limit
      ? nextCursorFor(items as unknown as { createdAt: Date; _id: Types.ObjectId }[])
      : null;
  return { items: items.map((e) => e.toClientJSON()), nextCursor: next };
}

export async function getEventById(
  eid: string,
  viewerUserId?: Types.ObjectId,
): Promise<{ event: IEvent; isManager: boolean; isAttending: boolean }> {
  if (!Types.ObjectId.isValid(eid)) throw AppError.notFound('Event not found');
  const event = await EventModel.findById(eid);
  if (!event) throw AppError.notFound('Event not found');
  const isManager = viewerUserId
    ? event.managers.some((m) => String(m) === String(viewerUserId))
    : false;
  let isAttending = false;
  if (viewerUserId) {
    const rsvp = await EventRSVP.findOne({ eventId: event._id, userId: viewerUserId });
    isAttending = !!rsvp && (rsvp.status === 'going' || rsvp.status === 'maybe');
  }
  return { event, isManager, isAttending };
}

export async function createEvent(
  community: { _id: Types.ObjectId },
  actor: IUser,
  role: CommunityRole | 'super',
  input: CreateEventInput,
): Promise<IEvent> {
  // Sub Admins cannot create paid events (PRD 05 §6).
  if (role === 'subadmin' && (input.pricing.type === 'paid' || (input.pricing.priceCents ?? 0) > 0)) {
    throw AppError.unauthorized('Sub Admins cannot create paid events');
  }
  const isRecurring = input.type === 'recurring';
  const event = await EventModel.create({
    ...input,
    communityId: community._id,
    createdBy: actor._id,
    // Strip mobile-style 'recurring' alias into the canonical 'recurring_parent'.
    type: isRecurring ? 'recurring_parent' : 'one_time',
  });
  await Community.updateOne({ _id: community._id }, { $inc: { 'metrics.eventCount': 1 } });
  // Materialize the first window of instances synchronously so the user sees them immediately.
  if (isRecurring) {
    const { materializeInstances } = await import('./recurring.service');
    await materializeInstances(event._id, { horizonDays: 60 });
  }
  return event;
}

export async function updateEvent(
  eid: string,
  role: CommunityRole | 'super',
  patch: UpdateEventInput,
  scope: 'this' | 'future' | 'all' = 'this',
): Promise<IEvent[]> {
  const event = await loadEvent(eid);
  if (role === 'subadmin' && patch.pricing) {
    const newType = patch.pricing.type ?? event.pricing.type;
    const newCents = patch.pricing.priceCents ?? event.pricing.priceCents;
    if (newType === 'paid' || (newCents ?? 0) > 0) {
      throw AppError.unauthorized('Sub Admins cannot set paid pricing on events');
    }
  }
  const { applyScopedEdit } = await import('./recurring.service');
  return applyScopedEdit(event, patch, scope);
}

export async function cancelEvent(
  eid: string,
  reason?: string,
  scope: 'this' | 'future' | 'all' = 'this',
): Promise<IEvent[]> {
  const event = await loadEvent(eid);
  const cancelOne = async (e: IEvent) => {
    if (e.status === 'cancelled') return;
    e.status = 'cancelled';
    e.cancelledAt = new Date();
    if (reason) e.cancellationReason = reason;
    await e.save();
    await EventRSVP.updateMany(
      { eventId: e._id, status: { $in: ['going', 'waitlist', 'maybe'] } },
      { $set: { status: 'cancelled' } },
    );
  };

  // One-time or 'this' scope: just the single event.
  if (event.type === 'one_time' || scope === 'this') {
    await cancelOne(event);
    return [event];
  }

  const parent =
    event.type === 'recurring_parent'
      ? event
      : await EventModel.findById(event.parentEventId);
  if (!parent) throw AppError.notFound('Parent event missing');

  const filter: Record<string, unknown> =
    scope === 'all'
      ? { $or: [{ _id: parent._id }, { parentEventId: parent._id }] }
      : {
          // 'future': from this instance forward; the parent template itself is also cancelled
          // so the daily cron won't materialize new ones.
          $or: [
            { _id: parent._id },
            { parentEventId: parent._id, startAt: { $gte: event.startAt } },
          ],
        };

  const docs = await EventModel.find(filter);
  for (const d of docs) {
    await cancelOne(d);
  }
  return docs;
}

export async function duplicateEvent(
  eid: string,
  actor: IUser,
): Promise<IEvent> {
  const source = await loadEvent(eid);
  const copy = await EventModel.create({
    communityId: source.communityId,
    title: `${source.title} (copy)`,
    description: source.description,
    category: source.category,
    coverImageUrl: source.coverImageUrl,
    type: 'one_time',
    startAt: source.startAt,
    endAt: source.endAt,
    timezone: source.timezone,
    location: source.location,
    capacity: source.capacity,
    speakers: source.speakers,
    pricing: source.pricing,
    visibility: source.visibility,
    status: 'draft',
    createdBy: actor._id,
  });
  return copy;
}

export async function rsvp(
  eid: string,
  user: IUser,
  input: RsvpInput,
): Promise<IEventRSVP> {
  const event = await loadEvent(eid);
  if (event.status !== 'published') {
    throw AppError.invalidInput('Event is not open for RSVPs');
  }
  // Membership check.
  const membership = await Membership.findOne({
    userId: user._id,
    communityId: event.communityId,
    status: 'active',
  });
  if (!membership && user.globalRole !== 'superadmin') {
    throw AppError.unauthorized('Must be a member to RSVP');
  }
  // Paid events require checkout unless the user holds an active subscription
  // that includes this event (event.pricing.subscriptionIncluded === true).
  if (
    event.pricing.type === 'paid' &&
    (event.pricing.priceCents ?? 0) > 0 &&
    input.status === 'going'
  ) {
    const subscriberCovered =
      event.pricing.subscriptionIncluded === true &&
      (await hasActiveSubscription(user._id, event.communityId));
    if (!subscriberCovered) {
      // The controller catches this and returns 402 with the PayPlus checkout URL.
      throw AppError.paymentRequired('Checkout required for paid event', {
        eventId: String(event._id),
        priceCents: event.pricing.priceCents,
        currency: event.pricing.currency,
      });
    }
  }

  // Capacity + waitlist: if going and capacity reached, push to waitlist.
  const finalStatus = input.status;
  if (input.status === 'going' && event.capacity != null) {
    const session = await mongoose.startSession();
    try {
      let resultDoc: IEventRSVP | null = null;
      await session.withTransaction(async () => {
        const goingCount = await EventRSVP.countDocuments({
          eventId: event._id,
          status: 'going',
        }).session(session);
        const candidateStatus: 'going' | 'waitlist' = goingCount >= event.capacity! ? 'waitlist' : 'going';
        const existing = await EventRSVP.findOne({ eventId: event._id, userId: user._id }).session(session);
        if (existing) {
          // Allow promotion only if going.
          existing.status = candidateStatus;
          existing.notes = input.notes ?? existing.notes;
          await existing.save({ session });
          resultDoc = existing;
        } else {
          const [created] = await EventRSVP.create(
            [
              {
                eventId: event._id,
                communityId: event.communityId,
                userId: user._id,
                status: candidateStatus,
                notes: input.notes,
              },
            ],
            { session },
          );
          resultDoc = created;
          await bumpMetricsForRsvpCreate(event._id, candidateStatus, session);
        }
      });
      session.endSession();
      return resultDoc!;
    } catch (err) {
      session.endSession();
      throw err;
    }
  } else {
    const existing = await EventRSVP.findOne({ eventId: event._id, userId: user._id });
    if (existing) {
      existing.status = finalStatus;
      existing.notes = input.notes ?? existing.notes;
      await existing.save();
      return existing;
    }
    const created = await EventRSVP.create({
      eventId: event._id,
      communityId: event.communityId,
      userId: user._id,
      status: finalStatus,
      notes: input.notes,
    });
    if (finalStatus === 'going') {
      await EventModel.updateOne({ _id: event._id }, { $inc: { 'metrics.rsvpCount': 1 } });
    }
    return created;
  }
}

async function bumpMetricsForRsvpCreate(
  eventId: Types.ObjectId,
  status: 'going' | 'waitlist',
  session: mongoose.ClientSession,
): Promise<void> {
  const inc: Record<string, number> = {};
  if (status === 'going') inc['metrics.rsvpCount'] = 1;
  if (status === 'waitlist') inc['metrics.waitlistCount'] = 1;
  if (Object.keys(inc).length) {
    await EventModel.updateOne({ _id: eventId }, { $inc: inc }, { session });
  }
}

export async function cancelRsvp(eid: string, user: IUser): Promise<{ promoted?: string }> {
  if (!Types.ObjectId.isValid(eid)) throw AppError.notFound('Event not found');
  const rsvpDoc = await EventRSVP.findOne({ eventId: eid, userId: user._id });
  if (!rsvpDoc) throw AppError.notFound('No RSVP to cancel');
  const wasGoing = rsvpDoc.status === 'going';
  rsvpDoc.status = 'cancelled';
  await rsvpDoc.save();
  await EventModel.updateOne(
    { _id: eid, 'metrics.rsvpCount': { $gt: 0 } },
    { $inc: { 'metrics.rsvpCount': wasGoing ? -1 : 0 } },
  );

  if (wasGoing) {
    // Promote first waitlister, oldest first.
    const next = await EventRSVP.findOne({
      eventId: eid,
      status: 'waitlist',
    }).sort({ createdAt: 1 });
    if (next) {
      next.status = 'going';
      await next.save();
      await EventModel.updateOne(
        { _id: eid },
        {
          $inc: {
            'metrics.rsvpCount': 1,
            'metrics.waitlistCount': -1,
          },
        },
      );
      return { promoted: String(next.userId) };
    }
  }
  return {};
}

export async function listRsvps(
  eid: string,
): Promise<Record<string, unknown>[]> {
  if (!Types.ObjectId.isValid(eid)) throw AppError.notFound('Event not found');
  const rsvps = await EventRSVP.find({ eventId: eid })
    .sort({ createdAt: 1 })
    .populate<{ userId: IUser }>('userId', 'email name photoUrl');
  // Waitlist position is 1-indexed by createdAt across the waitlist subset.
  let waitlistPos = 0;
  return rsvps.map((r) => {
    const user = r.userId as unknown as IUser & { _id: Types.ObjectId };
    let position: number | undefined;
    if (r.status === 'waitlist') {
      waitlistPos += 1;
      position = waitlistPos;
    }
    return {
      id: String(r._id),
      userId: String(user._id),
      email: user.email,
      name: user.name,
      photoUrl: user.photoUrl,
      status: r.status,
      paymentStatus: r.paymentStatus,
      attendedAt: r.attendedAt ?? null,
      waitlistPosition: position,
      createdAt: r.createdAt,
    };
  });
}

export async function assignManager(eid: string, userId: string): Promise<IEvent> {
  const event = await loadEvent(eid);
  if (!Types.ObjectId.isValid(userId)) throw AppError.invalidInput('Invalid user id');
  const uid = new Types.ObjectId(userId);
  // Must already be a member of the community.
  const membership = await Membership.findOne({
    userId: uid,
    communityId: event.communityId,
    status: 'active',
  });
  if (!membership) throw AppError.invalidInput('User is not a member of the community');
  if (!event.managers.some((m) => String(m) === userId)) {
    event.managers.push(uid);
    await event.save();
  }
  // Manager powers come from Event.managers[] alone per PRD 06 §4 — we no
  // longer flip Membership.role to 'event_manager'. The membership stays as
  // whatever community role the user already holds.
  return event;
}

export async function removeManager(eid: string, userId: string): Promise<IEvent> {
  const event = await loadEvent(eid);
  if (!Types.ObjectId.isValid(userId)) throw AppError.invalidInput('Invalid user id');
  event.managers = event.managers.filter((m) => String(m) !== userId);
  await event.save();
  return event;
}

export async function listMaterials(eid: string): Promise<IMaterial[]> {
  if (!Types.ObjectId.isValid(eid)) throw AppError.notFound('Event not found');
  return Material.find({ eventId: eid }).sort({ createdAt: -1 });
}

export async function addMaterial(
  eid: string,
  uploader: IUser,
  meta: CreateMaterialInput,
  file: { buffer: Buffer; originalName: string; mimeType: string; sizeBytes: number },
): Promise<IMaterial> {
  const event = await loadEvent(eid);
  const stored = await getStorageService().put({
    buffer: file.buffer,
    originalName: file.originalName,
    mimeType: file.mimeType,
  });
  return Material.create({
    eventId: event._id,
    communityId: event.communityId,
    title: meta.title,
    description: meta.description,
    type: meta.type,
    fileUrl: stored.url,
    fileSizeBytes: stored.sizeBytes,
    uploadedBy: uploader._id,
  });
}

async function loadEvent(eid: string): Promise<IEvent> {
  if (!Types.ObjectId.isValid(eid)) throw AppError.notFound('Event not found');
  const event = await EventModel.findById(eid);
  if (!event) throw AppError.notFound('Event not found');
  return event;
}
