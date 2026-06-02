import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import asyncHandler from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { ok, created } from '../utils/response';
import { auditFromReq } from '../services/audit.service';
import {
  startEventCheckout,
  startSubscriptionCheckout,
  listMySubscriptions,
  cancelMySubscription,
  listEventPayments,
  refundPayment,
  computeFinancials,
} from '../services/payment.service';
import { Community } from '../models/Community';
import { EventModel } from '../models/Event';

export const checkout = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  const result = await startEventCheckout(req.params.eid, req.user);
  await auditFromReq(req, {
    action: 'event.checkout.start',
    communityId: result.payment.communityId,
    targetType: 'payment',
    targetId: result.payment._id,
  });
  created(res, { sessionUrl: result.sessionUrl, paymentId: String(result.payment._id) });
});

export const subscribe = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || !req.membership) throw AppError.unauthenticated();
  const community = await Community.findById(req.membership.communityId);
  if (!community) throw AppError.notFound();
  const result = await startSubscriptionCheckout(community, req.user, req.body.plan);
  await auditFromReq(req, {
    action: 'subscription.checkout.start',
    communityId: community._id,
    targetType: 'community',
    targetId: community._id,
    metadata: { plan: req.body.plan },
  });
  created(res, { sessionUrl: result.sessionUrl });
});

export const mySubscriptions = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  const subs = await listMySubscriptions(req.user._id);
  ok(res, subs.map((s) => s.toClientJSON()));
});

export const cancelSubscription = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  const sub = await cancelMySubscription(req.user._id, req.params.sid);
  await auditFromReq(req, {
    action: 'subscription.cancel',
    communityId: sub.communityId,
    targetType: 'subscription',
    targetId: sub._id,
  });
  ok(res, sub.toClientJSON());
});

export const eventPayments = asyncHandler(async (req: Request, res: Response) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.eid)) {
    throw AppError.notFound('Event not found');
  }
  // Sanity: verify the event still exists (and the caller's loadEventScope already
  // confirmed they have admin/subadmin scope).
  const event = await EventModel.findById(req.params.eid, { _id: 1, communityId: 1 });
  if (!event) throw AppError.notFound('Event not found');
  const { items, nextCursor } = await listEventPayments(event._id, {
    limit: req.query.limit as number | undefined,
    cursor: req.query.cursor as string | undefined,
    status: req.query.status as
      | 'pending'
      | 'succeeded'
      | 'failed'
      | 'refunded'
      | 'partial_refund'
      | undefined,
  });
  ok(res, items, { nextCursor });
});

export const refund = asyncHandler(async (req: Request, res: Response) => {
  const outcome = await refundPayment(req.params.pid, {
    amountCents: req.body?.amountCents,
    reason: req.body?.reason,
  });
  await auditFromReq(req, {
    action: 'payment.refund',
    communityId: outcome.payment.communityId,
    targetType: 'payment',
    targetId: outcome.payment._id,
    metadata: {
      amountCents: req.body?.amountCents ?? 'full',
      refundedTotalCents: outcome.payment.refundedAmountCents,
      status: outcome.payment.status,
    },
  });
  ok(res, {
    payment: outcome.payment.toClientJSON(),
    rsvp: outcome.rsvp ? outcome.rsvp.toClientJSON() : null,
  });
});

export const finances = asyncHandler(async (req: Request, res: Response) => {
  if (!req.membership) throw AppError.unauthorized();
  const snapshot = await computeFinancials(req.membership.communityId);
  ok(res, snapshot);
});
