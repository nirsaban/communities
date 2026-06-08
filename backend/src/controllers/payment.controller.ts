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
import { Payment } from '../models/Payment';
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
  created(res, { paymentUrl: result.paymentUrl, paymentId: String(result.payment._id) });
});

export const subscribe = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || !req.membership) throw AppError.unauthenticated();
  const community = await Community.findById(req.membership.communityId);
  if (!community) throw AppError.notFound();
  const result = await startSubscriptionCheckout(community, req.user, req.body.plan);
  await auditFromReq(req, {
    action: 'subscription.checkout.start',
    communityId: community._id,
    targetType: 'subscription',
    targetId: result.subscription._id,
    metadata: { plan: req.body.plan },
  });
  created(res, {
    paymentUrl: result.paymentUrl,
    subscriptionId: String(result.subscription._id),
  });
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

// GET /api/v1/payments/:pid — admin-of-community detail view used by the
// IssueRefund screen. Caller must be a member of the payment's community
// with admin role (sub-admin is blocked at the route layer).
export const getPayment = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  const { Payment } = await import('../models/Payment');
  const { Membership } = await import('../models/Membership');
  const payment = await Payment.findById(req.params.pid);
  if (!payment) throw AppError.notFound('Payment not found');
  if (req.user.globalRole !== 'superadmin') {
    const m = await Membership.findOne({
      userId: req.user._id,
      communityId: payment.communityId,
      status: 'active',
    });
    if (!m || (m.role !== 'admin' && m.role !== 'subadmin')) {
      throw AppError.unauthorized('Not allowed');
    }
  }
  ok(res, payment.toClientJSON());
});

/**
 * Polled by the mobile checkout screen after the user returns from PayPlus.
 * No auth. Returns { status, paymentId } so the client can flip to the success
 * screen as soon as the webhook lands. Never reveals the gatewayToken.
 */
export const paymentSuccessLanding = asyncHandler(async (req: Request, res: Response) => {
  const ref = String(req.query.ref ?? '');
  if (!mongoose.Types.ObjectId.isValid(ref)) {
    res.status(200).json({ data: { status: 'unknown', paymentId: null } });
    return;
  }
  const payment = await Payment.findById(ref).select(
    '_id status gateway gatewayTransactionId amountCents currency installments',
  );
  if (!payment) {
    res.status(200).json({ data: { status: 'unknown', paymentId: null } });
    return;
  }
  res.status(200).json({
    data: {
      paymentId: String(payment._id),
      status: payment.status,
      gateway: payment.gateway,
      amountCents: payment.amountCents,
      currency: payment.currency,
      installments: payment.installments,
    },
  });
});

/**
 * Returned to the user's browser/webview when PayPlus signals a failure. Read-only
 * landing — the actual Payment row is flipped to `failed` by the webhook.
 */
export const paymentFailureLanding = asyncHandler(async (req: Request, res: Response) => {
  const ref = String(req.query.ref ?? '');
  res.status(200).json({
    data: { status: 'failed', paymentId: mongoose.Types.ObjectId.isValid(ref) ? ref : null },
  });
});
