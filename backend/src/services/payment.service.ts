import mongoose, { Types } from 'mongoose';
import { Payment, IPayment } from '../models/Payment';
import { Subscription, ISubscription, SubscriptionPlan } from '../models/Subscription';
import { EventModel, IEvent } from '../models/Event';
import { EventRSVP, IEventRSVP } from '../models/EventRSVP';
import { Community, ICommunity } from '../models/Community';
import { Membership } from '../models/Membership';
import { AppError } from '../utils/AppError';
import { getStripeService } from './stripe.service';
import env from '../config/env';
import logger from '../config/logger';
import { cursorFilter, nextCursorFor, parsePagination } from '../utils/pagination';
import type { IUser } from '../models/User';

export class PaymentNotApplicableError extends AppError {
  constructor() {
    super('INVALID_INPUT', 'Event is free; no checkout required');
  }
}

export interface CheckoutResult {
  sessionUrl: string;
  payment: IPayment;
}

/** Create a Stripe Checkout Session for a paid event and persist a pending payment row. */
export async function startEventCheckout(
  eid: string,
  user: IUser,
): Promise<CheckoutResult> {
  if (!Types.ObjectId.isValid(eid)) throw AppError.notFound('Event not found');
  const event = await EventModel.findById(eid);
  if (!event) throw AppError.notFound('Event not found');

  if (event.status !== 'published') {
    throw AppError.invalidInput('Event is not open for RSVPs');
  }
  if (event.pricing.type !== 'paid' || (event.pricing.priceCents ?? 0) <= 0) {
    throw new PaymentNotApplicableError();
  }
  // Membership check — paying members only.
  if (user.globalRole !== 'superadmin') {
    const membership = await Membership.findOne({
      userId: user._id,
      communityId: event.communityId,
      status: 'active',
    });
    if (!membership) throw AppError.unauthorized('Must be a member to checkout');
  }

  // If user already has a confirmed paid RSVP, short-circuit.
  const existingPaid = await EventRSVP.findOne({
    eventId: event._id,
    userId: user._id,
    paymentStatus: 'paid',
    status: 'going',
  });
  if (existingPaid) {
    throw AppError.conflict('You have already paid for this event');
  }

  const community = await Community.findById(event.communityId);
  if (!community) throw AppError.notFound('Community not found');

  // Subscribers with `subscriptionIncluded` skip the checkout entirely.
  if (event.pricing.subscriptionIncluded && (await hasActiveSubscription(user._id, event.communityId))) {
    const rsvp = await placeSubscriptionRsvp(event, user._id);
    throw AppError.conflict(
      `Subscription already grants access; RSVP confirmed (status=${rsvp.status})`,
    );
  }

  // Persist a pending Payment row first so the webhook can correlate by checkout session id.
  const payment = await Payment.create({
    communityId: event.communityId,
    userId: user._id,
    eventId: event._id,
    amountCents: event.pricing.priceCents ?? 0,
    currency: event.pricing.currency || 'USD',
    status: 'pending',
  });

  const session = await getStripeService().createEventCheckoutSession({
    amountCents: event.pricing.priceCents ?? 0,
    currency: event.pricing.currency || 'USD',
    eventTitle: event.title,
    customerEmail: user.email,
    successUrl: env.CHECKOUT_SUCCESS_URL,
    cancelUrl: env.CHECKOUT_CANCEL_URL,
    metadata: {
      paymentId: String(payment._id),
      eventId: String(event._id),
      communityId: String(event.communityId),
      userId: String(user._id),
      kind: 'event',
    },
    stripeAccountId: community.stripeAccountId,
    applicationFeeBps: env.STRIPE_PLATFORM_FEE_BPS,
  });

  payment.stripeCheckoutSessionId = session.sessionId;
  if (session.paymentIntentId) payment.stripePaymentIntentId = session.paymentIntentId;
  await payment.save();

  return { sessionUrl: session.url, payment };
}

/** Create a Stripe subscription Checkout Session. */
export async function startSubscriptionCheckout(
  community: ICommunity,
  user: IUser,
  plan: SubscriptionPlan,
): Promise<{ sessionUrl: string }> {
  let priceId =
    plan === 'monthly'
      ? env.STRIPE_SUBSCRIPTION_MONTHLY_PRICE_ID
      : env.STRIPE_SUBSCRIPTION_ANNUAL_PRICE_ID;
  if (!priceId) {
    // Allow the stub Stripe to run end-to-end in dev without real price IDs.
    // The stub ignores `priceId`; production still demands a real one.
    if (env.NODE_ENV === 'production' || env.STRIPE_SECRET_KEY) {
      throw AppError.invalidInput(
        `Stripe ${plan} price ID not configured (set STRIPE_SUBSCRIPTION_${plan.toUpperCase()}_PRICE_ID)`,
      );
    }
    priceId = `price_stub_${plan}`;
  }

  const session = await getStripeService().createSubscriptionCheckoutSession({
    priceId,
    customerEmail: user.email,
    successUrl: env.CHECKOUT_SUCCESS_URL,
    cancelUrl: env.CHECKOUT_CANCEL_URL,
    metadata: {
      communityId: String(community._id),
      userId: String(user._id),
      plan,
      kind: 'subscription',
    },
    stripeAccountId: community.stripeAccountId,
  });
  return { sessionUrl: session.url };
}

export async function listMySubscriptions(userId: Types.ObjectId): Promise<ISubscription[]> {
  return Subscription.find({
    userId,
    status: { $in: ['active', 'past_due', 'incomplete'] },
  }).sort({ createdAt: -1 });
}

export async function cancelMySubscription(
  userId: Types.ObjectId,
  sid: string,
): Promise<ISubscription> {
  if (!Types.ObjectId.isValid(sid)) throw AppError.notFound('Subscription not found');
  const sub = await Subscription.findOne({ _id: sid, userId });
  if (!sub) throw AppError.notFound('Subscription not found');
  if (sub.status === 'cancelled') return sub;
  const updated = await getStripeService().cancelSubscription(sub.stripeSubscriptionId);
  sub.cancelAtPeriodEnd = updated.cancelAtPeriodEnd;
  // Stripe still reports `active` until period end; preserve that locally.
  await sub.save();
  return sub;
}

export interface ListPaymentsOpts {
  limit?: number;
  cursor?: string;
  status?: 'pending' | 'succeeded' | 'failed' | 'refunded' | 'partial_refund';
}

export async function listEventPayments(
  eventId: Types.ObjectId,
  opts: ListPaymentsOpts,
): Promise<{ items: Record<string, unknown>[]; nextCursor: string | null }> {
  const { limit, cursor } = parsePagination({ limit: opts.limit, cursor: opts.cursor });
  const filter: Record<string, unknown> = { eventId };
  if (opts.status) filter.status = opts.status;
  Object.assign(filter, cursorFilter(cursor));
  const rows = await Payment.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1);
  const items = rows.slice(0, limit);
  const next =
    rows.length > limit
      ? nextCursorFor(items as unknown as { createdAt: Date; _id: Types.ObjectId }[])
      : null;
  return { items: items.map((p) => p.toClientJSON()), nextCursor: next };
}

export interface RefundOutcome {
  payment: IPayment;
  rsvp: IEventRSVP | null;
}

export async function refundPayment(
  pid: string,
  opts: { amountCents?: number; reason?: 'requested_by_customer' | 'duplicate' | 'fraudulent' },
): Promise<RefundOutcome> {
  if (!Types.ObjectId.isValid(pid)) throw AppError.notFound('Payment not found');
  const payment = await Payment.findById(pid);
  if (!payment) throw AppError.notFound('Payment not found');
  if (payment.status !== 'succeeded' && payment.status !== 'partial_refund') {
    throw AppError.invalidInput(`Cannot refund a payment in status ${payment.status}`);
  }
  if (!payment.stripePaymentIntentId) {
    throw AppError.invalidInput('Payment has no Stripe PaymentIntent to refund');
  }
  const remaining = payment.amountCents - payment.refundedAmountCents;
  const refundCents = opts.amountCents ?? remaining;
  if (refundCents <= 0 || refundCents > remaining) {
    throw AppError.invalidInput(
      `Refund amount ${refundCents} must be >0 and ≤ remaining ${remaining}`,
    );
  }

  const community = await Community.findById(payment.communityId);
  const result = await getStripeService().refundPaymentIntent({
    paymentIntentId: payment.stripePaymentIntentId,
    amountCents: opts.amountCents,
    stripeAccountId: community?.stripeAccountId,
    reason: opts.reason,
  });

  payment.refundedAmountCents += result.amountCents;
  payment.status =
    payment.refundedAmountCents >= payment.amountCents ? 'refunded' : 'partial_refund';
  await payment.save();

  // Cancel RSVP if the full amount is now refunded.
  let rsvp: IEventRSVP | null = null;
  if (payment.status === 'refunded' && payment.eventId) {
    rsvp = await EventRSVP.findOne({ eventId: payment.eventId, userId: payment.userId });
    if (rsvp) {
      rsvp.status = 'cancelled';
      rsvp.paymentStatus = 'refunded';
      await rsvp.save();
      // Stub: in P7 we'll push a real notification. For now log.
      logger.info({
        msg: 'refund.notification',
        userId: String(rsvp.userId),
        eventId: String(payment.eventId),
        amountCents: result.amountCents,
      });
    }
  }
  return { payment, rsvp };
}

export interface FinancialSnapshot {
  totalRevenueCents: number;
  revenueThisMonth: number;
  revenueThisWeek: number;
  activeSubscriptions: number;
  revenueByEvent: Array<{
    eventId: string;
    title: string;
    revenueCents: number;
    paidCount: number;
  }>;
}

export async function computeFinancials(communityId: Types.ObjectId): Promise<FinancialSnapshot> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - 7);

  const [totals, monthAgg, weekAgg, activeSubs, byEvent] = await Promise.all([
    Payment.aggregate<{ _id: null; sum: number }>([
      { $match: { communityId, status: { $in: ['succeeded', 'partial_refund'] } } },
      {
        $group: {
          _id: null,
          sum: { $sum: { $subtract: ['$amountCents', '$refundedAmountCents'] } },
        },
      },
    ]),
    Payment.aggregate<{ _id: null; sum: number }>([
      {
        $match: {
          communityId,
          status: { $in: ['succeeded', 'partial_refund'] },
          createdAt: { $gte: startOfMonth },
        },
      },
      {
        $group: {
          _id: null,
          sum: { $sum: { $subtract: ['$amountCents', '$refundedAmountCents'] } },
        },
      },
    ]),
    Payment.aggregate<{ _id: null; sum: number }>([
      {
        $match: {
          communityId,
          status: { $in: ['succeeded', 'partial_refund'] },
          createdAt: { $gte: startOfWeek },
        },
      },
      {
        $group: {
          _id: null,
          sum: { $sum: { $subtract: ['$amountCents', '$refundedAmountCents'] } },
        },
      },
    ]),
    Subscription.countDocuments({ communityId, status: 'active' }),
    Payment.aggregate<{
      _id: Types.ObjectId;
      revenueCents: number;
      paidCount: number;
    }>([
      {
        $match: {
          communityId,
          status: { $in: ['succeeded', 'partial_refund'] },
          eventId: { $ne: null },
        },
      },
      {
        $group: {
          _id: '$eventId',
          revenueCents: { $sum: { $subtract: ['$amountCents', '$refundedAmountCents'] } },
          paidCount: { $sum: 1 },
        },
      },
      { $sort: { revenueCents: -1 } },
      { $limit: 50 },
    ]),
  ]);

  // Hydrate event titles.
  const eventIds = byEvent.map((r) => r._id);
  const events = await EventModel.find({ _id: { $in: eventIds } }, { title: 1 }).lean();
  const titleMap = new Map(events.map((e) => [String(e._id), e.title]));

  return {
    totalRevenueCents: totals[0]?.sum ?? 0,
    revenueThisMonth: monthAgg[0]?.sum ?? 0,
    revenueThisWeek: weekAgg[0]?.sum ?? 0,
    activeSubscriptions: activeSubs,
    revenueByEvent: byEvent.map((r) => ({
      eventId: String(r._id),
      title: titleMap.get(String(r._id)) ?? '(deleted event)',
      revenueCents: r.revenueCents,
      paidCount: r.paidCount,
    })),
  };
}

// ---- helpers shared with webhook handler / RSVP service ----

export async function hasActiveSubscription(
  userId: Types.ObjectId,
  communityId: Types.ObjectId,
): Promise<boolean> {
  const sub = await Subscription.findOne({ userId, communityId, status: 'active' });
  return !!sub;
}

async function placeSubscriptionRsvp(event: IEvent, userId: Types.ObjectId): Promise<IEventRSVP> {
  const existing = await EventRSVP.findOne({ eventId: event._id, userId });
  if (existing) {
    existing.status = 'going';
    existing.paymentStatus = 'paid';
    await existing.save();
    return existing;
  }
  return EventRSVP.create({
    eventId: event._id,
    communityId: event.communityId,
    userId,
    status: 'going',
    paymentStatus: 'paid',
  });
}

/**
 * Called by the Stripe webhook when checkout.session.completed fires for a one-time
 * event payment. Marks the Payment succeeded and creates/promotes the RSVP.
 */
export async function settleEventPayment(args: {
  paymentId: string;
  paymentIntentId: string;
  amountReceivedCents?: number;
}): Promise<{ payment: IPayment; rsvp: IEventRSVP } | null> {
  const payment = await Payment.findById(args.paymentId);
  if (!payment) return null;
  if (payment.status === 'succeeded') {
    // Idempotent: already processed.
    const rsvp = payment.rsvpId
      ? await EventRSVP.findById(payment.rsvpId)
      : await EventRSVP.findOne({ eventId: payment.eventId, userId: payment.userId });
    return rsvp ? { payment, rsvp } : null;
  }
  if (!payment.eventId) {
    payment.status = 'succeeded';
    payment.stripePaymentIntentId = args.paymentIntentId;
    await payment.save();
    return null;
  }
  const event = await EventModel.findById(payment.eventId);
  if (!event) return null;

  const session = await mongoose.startSession();
  try {
    let outcome: { rsvp: IEventRSVP } | null = null;
    await session.withTransaction(async () => {
      const existing = await EventRSVP.findOne({
        eventId: event._id,
        userId: payment.userId,
      }).session(session);
      let rsvp: IEventRSVP;
      if (existing) {
        existing.status = 'going';
        existing.paymentStatus = 'paid';
        existing.paymentId = payment._id;
        await existing.save({ session });
        rsvp = existing;
      } else {
        const [created] = await EventRSVP.create(
          [
            {
              eventId: event._id,
              communityId: event.communityId,
              userId: payment.userId,
              status: 'going',
              paymentStatus: 'paid',
              paymentId: payment._id,
            },
          ],
          { session },
        );
        rsvp = created;
        await EventModel.updateOne(
          { _id: event._id },
          { $inc: { 'metrics.rsvpCount': 1, 'metrics.paidCount': 1, 'metrics.totalRevenueCents': payment.amountCents } },
          { session },
        );
        await Community.updateOne(
          { _id: event.communityId },
          { $inc: { 'metrics.totalRevenueCents': payment.amountCents } },
          { session },
        );
      }
      payment.status = 'succeeded';
      payment.rsvpId = rsvp._id;
      payment.stripePaymentIntentId = args.paymentIntentId;
      await payment.save({ session });
      outcome = { rsvp };
    });
    const result = outcome as { rsvp: IEventRSVP } | null;
    return result ? { payment, rsvp: result.rsvp } : null;
  } finally {
    session.endSession();
  }
}
