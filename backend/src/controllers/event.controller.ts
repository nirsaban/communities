import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import { AppError } from '../utils/AppError';
import { ok, created, noContent } from '../utils/response';
import asyncHandler from '../utils/asyncHandler';
import {
  listEvents,
  getEventById,
  createEvent,
  updateEvent,
  cancelEvent,
  duplicateEvent,
  rsvp,
  cancelRsvp,
  listRsvps,
  assignManager,
  removeManager,
  listMaterials,
  addMaterial,
} from '../services/event.service';
import { auditFromReq } from '../services/audit.service';
import { startEventCheckout } from '../services/payment.service';
import { getLoadedEvent } from '../middleware/eventScope';
import { EventRSVP } from '../models/EventRSVP';
import { fanOut, getNotificationService } from '../services/notification.service';
import env from '../config/env';

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_UPLOAD_BYTES },
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  if (!req.membership) throw AppError.unauthorized();
  const role = req.user?.globalRole === 'superadmin' ? 'super' : req.membership.role;
  const { items, nextCursor } = await listEvents(req.membership.communityId, role, {
    limit: req.query.limit as number | undefined,
    cursor: req.query.cursor as string | undefined,
    status: req.query.status as 'draft' | 'published' | 'cancelled' | 'completed' | undefined,
    from: req.query.from as Date | undefined,
    to: req.query.to as Date | undefined,
  });
  ok(res, items, { nextCursor });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || !req.membership) throw AppError.unauthorized();
  const role = req.user.globalRole === 'superadmin' ? 'super' : req.membership.role;
  const event = await createEvent({ _id: req.membership.communityId }, req.user, role, req.body);
  await auditFromReq(req, {
    action: 'event.create',
    communityId: req.membership.communityId,
    targetType: 'event',
    targetId: event._id,
  });
  created(res, event.toClientJSON());
});

export const detail = asyncHandler(async (req: Request, res: Response) => {
  const event = getLoadedEvent(req);
  const { isManager: isManagerByGrant, isAttending } = await getEventById(
    String(event._id),
    req.user?._id,
  );
  // Mirror the authz that `requireEventManager` applies: community admins,
  // sub-admins, and super admins act as managers on every event in their
  // community even when they aren't in `event.managers[]`. Without this the
  // frontend EventManagerGate 403s an admin who just created an event.
  const role = req.membership?.role;
  const isAdminLike =
    req.user?.globalRole === 'superadmin' || role === 'admin' || role === 'subadmin';
  const isManager = isManagerByGrant || isAdminLike;
  ok(res, {
    ...event.toClientJSON(),
    viewer: { isManager, isAttending },
  });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || !req.membership) throw AppError.unauthorized();
  const role = req.user.globalRole === 'superadmin' ? 'super' : req.membership.role;
  const scope = (req.query.scope as 'this' | 'future' | 'all' | undefined) ?? 'this';
  const events = await updateEvent(req.params.eid, role, req.body, scope);
  const head = events[0];
  await auditFromReq(req, {
    action: 'event.update',
    communityId: head.communityId,
    targetType: 'event',
    targetId: head._id,
    metadata: { fields: Object.keys(req.body), scope, affected: events.length },
  });
  ok(res, events.map((e) => e.toClientJSON()), { count: events.length, scope });
});

export const cancel = asyncHandler(async (req: Request, res: Response) => {
  const scope = (req.query.scope as 'this' | 'future' | 'all' | undefined) ?? 'this';
  const events = await cancelEvent(req.params.eid, req.body?.reason, scope);
  const head = events[0];
  await auditFromReq(req, {
    action: 'event.cancel',
    communityId: head.communityId,
    targetType: 'event',
    targetId: head._id,
    metadata: { reason: req.body?.reason, scope, affected: events.length },
  });
  ok(res, events.map((e) => e.toClientJSON()), { count: events.length, scope });
});

export const duplicate = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  const event = await duplicateEvent(req.params.eid, req.user);
  await auditFromReq(req, {
    action: 'event.duplicate',
    communityId: event.communityId,
    targetType: 'event',
    targetId: event._id,
  });
  created(res, event.toClientJSON());
});

export const doRsvp = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  try {
    const rsvpDoc = await rsvp(req.params.eid, req.user, req.body);
    await auditFromReq(req, {
      action: 'event.rsvp',
      communityId: rsvpDoc.communityId,
      targetType: 'eventRsvp',
      targetId: rsvpDoc._id,
      metadata: { status: rsvpDoc.status },
    });
    created(res, rsvpDoc.toClientJSON());
  } catch (err) {
    // Paid event → kick off PayPlus hosted-page checkout and respond 402 with the URL.
    if (err instanceof AppError && err.code === 'PAYMENT_REQUIRED') {
      const checkout = await startEventCheckout(req.params.eid, req.user);
      await auditFromReq(req, {
        action: 'event.checkout.start',
        communityId: checkout.payment.communityId,
        targetType: 'payment',
        targetId: checkout.payment._id,
      });
      res.status(402).json({
        error: {
          code: 'PAYMENT_REQUIRED',
          message: 'Checkout required for paid event',
          details: { checkoutUrl: checkout.paymentUrl, paymentId: String(checkout.payment._id) },
        },
      });
      return;
    }
    throw err;
  }
});

export const cancelRsvpHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  const result = await cancelRsvp(req.params.eid, req.user);
  ok(res, { cancelled: true, promotedUserId: result.promoted ?? null });
});

export const rsvps = asyncHandler(async (req: Request, res: Response) => {
  const items = await listRsvps(req.params.eid);
  ok(res, items);
});

export const addManager = asyncHandler(async (req: Request, res: Response) => {
  const event = await assignManager(req.params.eid, req.body.userId);
  await auditFromReq(req, {
    action: 'event.assignManager',
    communityId: event.communityId,
    targetType: 'event',
    targetId: event._id,
    metadata: { userId: req.body.userId },
  });
  // Cross-role visibility: the new EM should learn about the assignment without
  // having to check the manage tab. Deep-link goes to the event command center.
  try {
    await getNotificationService().send({
      userId: req.body.userId,
      communityId: event.communityId,
      type: 'role.event_manager.assigned',
      title: `You're managing ${event.title}`,
      body: 'Open the command center to set up check-in, recap and broadcast.',
      payload: {
        eventId: String(event._id),
        deepLink: `/events/${String(event._id)}/command`,
      },
    });
  } catch {
    // Notification fan-out is best-effort; assignment itself succeeded.
  }
  ok(res, event.toClientJSON());
});

export const removeManagerHandler = asyncHandler(async (req: Request, res: Response) => {
  const event = await removeManager(req.params.eid, req.params.uid);
  await auditFromReq(req, {
    action: 'event.removeManager',
    communityId: event.communityId,
    targetType: 'event',
    targetId: event._id,
    metadata: { userId: req.params.uid },
  });
  ok(res, event.toClientJSON());
});

export const materials = asyncHandler(async (req: Request, res: Response) => {
  const items = await listMaterials(req.params.eid);
  ok(res, items.map((m) => m.toClientJSON()));
});

export const createMaterial = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  const file = req.file;
  if (!file) {
    throw AppError.invalidInput('File is required (multipart field "file")');
  }
  const meta = req.body as { title?: string; description?: string; type?: string };
  if (!meta.title) throw AppError.invalidInput('Title is required');
  const material = await addMaterial(
    req.params.eid,
    req.user,
    {
      title: meta.title,
      description: meta.description,
      type: (meta.type as 'pdf' | 'video' | 'audio' | 'image' | 'slides' | 'other') ?? 'other',
    },
    {
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    },
  );
  await auditFromReq(req, {
    action: 'event.materialUpload',
    communityId: material.communityId,
    targetType: 'material',
    targetId: material._id,
  });
  created(res, material.toClientJSON());
});

export const removeNothing = asyncHandler(async (_req: Request, res: Response) => {
  noContent(res);
});

// POST /api/v1/events/:eid/rsvps/:rid/check-in   (event manager / admin)
export const checkInRsvp = asyncHandler(async (req: Request, res: Response) => {
  const event = getLoadedEvent(req);
  if (!mongoose.Types.ObjectId.isValid(req.params.rid)) {
    throw AppError.notFound('RSVP not found');
  }
  const rsvp = await EventRSVP.findOne({ _id: req.params.rid, eventId: event._id });
  if (!rsvp) throw AppError.notFound('RSVP not found');
  rsvp.attendedAt = rsvp.attendedAt ? undefined : new Date();
  await rsvp.save();
  ok(res, rsvp.toClientJSON());
});

// POST /api/v1/events/:eid/check-in-all    (event manager / admin)
export const checkInAll = asyncHandler(async (req: Request, res: Response) => {
  const event = getLoadedEvent(req);
  const now = new Date();
  const result = await EventRSVP.updateMany(
    { eventId: event._id, status: 'going', attendedAt: { $exists: false } },
    { $set: { attendedAt: now } },
  );
  ok(res, { updated: result.modifiedCount, attendedAt: now });
});

// POST /api/v1/events/:eid/recap   body: { body, photoUrls?, notify? }   (event manager / admin)
export const publishRecap = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  const event = getLoadedEvent(req);
  const body = String(req.body?.body ?? '').trim();
  if (body.length < 1) throw AppError.invalidInput('recap body required');
  const photoUrls = Array.isArray(req.body?.photoUrls)
    ? (req.body.photoUrls as unknown[])
        .filter((u): u is string => typeof u === 'string')
        .slice(0, 12)
    : [];
  event.summary = {
    body,
    photoUrls,
    publishedAt: new Date(),
  };
  await event.save();
  const notify = !!req.body?.notify;
  let notified = 0;
  if (notify) {
    // Fan-out: only attendees with a `going` RSVP who actually showed up
    // (`attendedAt` non-null) get the recap notification. Deep-link goes to
    // the recap screen so members can see what the host wrote in one tap.
    const attended = await EventRSVP.find({
      eventId: event._id,
      status: 'going',
      attendedAt: { $exists: true, $ne: null },
    })
      .select('userId')
      .lean();
    if (attended.length > 0) {
      const result = await fanOut(
        attended.map((r) => ({
          userId: r.userId,
          communityId: event.communityId,
          type: 'recap.published',
          title: `Recap is up: ${event.title}`,
          body: 'See photos and the host’s notes from the event.',
          payload: {
            eventId: String(event._id),
            deepLink: `/events/${String(event._id)}/recap`,
          },
        })),
      );
      notified = result.delivered;
    }
  }
  await auditFromReq(req, {
    action: 'event.recap.publish',
    communityId: event.communityId,
    targetType: 'event',
    targetId: event._id,
    metadata: { notify, photos: photoUrls.length, notified },
  });
  ok(res, event.toClientJSON(), { notified });
});
