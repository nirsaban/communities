import mongoose, { Schema, Model, Types } from 'mongoose';
import type Stripe from 'stripe';
import logger from '../config/logger';
import { Payment } from '../models/Payment';
import { Subscription } from '../models/Subscription';
import { EventRSVP } from '../models/EventRSVP';
import { EventModel } from '../models/Event';
import { Community } from '../models/Community';
import { settleEventPayment } from './payment.service';

// Tiny dedicated collection for idempotency. Storing the Stripe event id with a
// unique index prevents double-processing on retries.
interface IProcessedWebhook {
  _id: string; // Stripe event.id
  type: string;
  processedAt: Date;
}

const processedWebhookSchema = new Schema<IProcessedWebhook>(
  {
    _id: { type: String, required: true },
    type: { type: String, required: true },
    processedAt: { type: Date, default: Date.now },
  },
  { _id: false, versionKey: false },
);
// TTL: keep 30 days of dedupe history; webhooks retry over a much shorter window.
processedWebhookSchema.index({ processedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

const ProcessedWebhook: Model<IProcessedWebhook> = mongoose.models.ProcessedWebhook ||
  mongoose.model<IProcessedWebhook>('ProcessedWebhook', processedWebhookSchema);

export interface WebhookOutcome {
  duplicate: boolean;
  handled: boolean;
  type: string;
}

export async function handleWebhookEvent(event: Stripe.Event): Promise<WebhookOutcome> {
  // Reserve the event id; duplicate key error means another worker already handled it.
  try {
    await ProcessedWebhook.create({ _id: event.id, type: event.type });
  } catch (err: unknown) {
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code?: number }).code === 11000
    ) {
      logger.info({ msg: 'stripe.webhook.duplicate', id: event.id, type: event.type });
      return { duplicate: true, handled: true, type: event.type };
    }
    throw err;
  }

  switch (event.type) {
    case 'checkout.session.completed':
      await onCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case 'payment_intent.payment_failed':
      await onPaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
      break;
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await upsertSubscription(event.data.object as Stripe.Subscription);
      break;
    case 'customer.subscription.deleted':
      await onSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
    case 'charge.refunded':
      await onChargeRefunded(event.data.object as Stripe.Charge);
      break;
    default:
      // Unknown event types are still recorded as processed so Stripe stops retrying.
      logger.info({ msg: 'stripe.webhook.ignored', type: event.type });
      return { duplicate: false, handled: false, type: event.type };
  }
  return { duplicate: false, handled: true, type: event.type };
}

async function onCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const md = (session.metadata ?? {}) as Record<string, string>;
  // One-time event payment.
  if (md.kind === 'event' && md.paymentId) {
    const pi = typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id;
    if (!pi) {
      logger.warn({ msg: 'stripe.webhook.event.missingPI', sessionId: session.id });
      return;
    }
    await settleEventPayment({
      paymentId: md.paymentId,
      paymentIntentId: pi,
      amountReceivedCents: session.amount_total ?? undefined,
    });
    return;
  }
  // Subscription: the customer.subscription.created event handles the heavy lifting.
  if (md.kind === 'subscription' && md.userId && md.communityId && md.plan) {
    logger.info({
      msg: 'stripe.webhook.subscription.checkoutCompleted',
      sessionId: session.id,
      plan: md.plan,
    });
    return;
  }
  logger.warn({ msg: 'stripe.webhook.event.unknownKind', sessionId: session.id, metadata: md });
}

async function onPaymentIntentFailed(pi: Stripe.PaymentIntent): Promise<void> {
  const payment = await Payment.findOne({ stripePaymentIntentId: pi.id });
  if (!payment) return;
  payment.status = 'failed';
  await payment.save();
  logger.info({ msg: 'stripe.webhook.paymentFailed', paymentId: String(payment._id) });
}

async function upsertSubscription(s: Stripe.Subscription): Promise<void> {
  const md = (s.metadata ?? {}) as Record<string, string>;
  const userId = md.userId;
  const communityId = md.communityId;
  const plan = (md.plan as 'monthly' | 'annual' | undefined) ?? 'monthly';
  if (!userId || !communityId) {
    logger.warn({ msg: 'stripe.webhook.subscription.noMetadata', subId: s.id });
    return;
  }

  const status = mapSubscriptionStatus(s.status);
  const customerId = typeof s.customer === 'string' ? s.customer : s.customer?.id;
  const existing = await Subscription.findOne({ stripeSubscriptionId: s.id });
  if (existing) {
    existing.status = status;
    existing.stripeCustomerId = customerId ?? existing.stripeCustomerId;
    existing.currentPeriodStart = s.current_period_start
      ? new Date(s.current_period_start * 1000)
      : existing.currentPeriodStart;
    existing.currentPeriodEnd = s.current_period_end
      ? new Date(s.current_period_end * 1000)
      : existing.currentPeriodEnd;
    existing.cancelAtPeriodEnd = s.cancel_at_period_end;
    await existing.save();
  } else {
    await Subscription.create({
      communityId: new Types.ObjectId(communityId),
      userId: new Types.ObjectId(userId),
      stripeSubscriptionId: s.id,
      stripeCustomerId: customerId,
      plan,
      status,
      currentPeriodStart: s.current_period_start
        ? new Date(s.current_period_start * 1000)
        : undefined,
      currentPeriodEnd: s.current_period_end
        ? new Date(s.current_period_end * 1000)
        : undefined,
      cancelAtPeriodEnd: s.cancel_at_period_end,
    });
  }
}

async function onSubscriptionDeleted(s: Stripe.Subscription): Promise<void> {
  await Subscription.updateOne(
    { stripeSubscriptionId: s.id },
    { $set: { status: 'cancelled' } },
  );
}

async function onChargeRefunded(charge: Stripe.Charge): Promise<void> {
  const pi = typeof charge.payment_intent === 'string'
    ? charge.payment_intent
    : charge.payment_intent?.id;
  if (!pi) return;
  const payment = await Payment.findOne({ stripePaymentIntentId: pi });
  if (!payment) return;
  // Refund-by-Stripe (e.g. via dashboard) — sync our state without re-calling the API.
  const refundedTotal = charge.amount_refunded ?? 0;
  payment.refundedAmountCents = Math.max(payment.refundedAmountCents, refundedTotal);
  payment.status =
    payment.refundedAmountCents >= payment.amountCents ? 'refunded' : 'partial_refund';
  await payment.save();

  if (payment.status === 'refunded' && payment.eventId) {
    const rsvp = await EventRSVP.findOne({ eventId: payment.eventId, userId: payment.userId });
    if (rsvp && rsvp.status !== 'cancelled') {
      rsvp.status = 'cancelled';
      rsvp.paymentStatus = 'refunded';
      await rsvp.save();
      // Roll back denormalized counters once.
      await EventModel.updateOne(
        { _id: payment.eventId, 'metrics.rsvpCount': { $gt: 0 } },
        { $inc: { 'metrics.rsvpCount': -1, 'metrics.paidCount': -1 } },
      );
      await Community.updateOne(
        { _id: payment.communityId },
        { $inc: { 'metrics.totalRevenueCents': -payment.amountCents } },
      );
    }
  }
}

function mapSubscriptionStatus(
  s: Stripe.Subscription.Status,
): 'active' | 'past_due' | 'cancelled' | 'incomplete' {
  switch (s) {
    case 'active':
    case 'trialing':
      return 'active';
    case 'past_due':
    case 'unpaid':
      return 'past_due';
    case 'canceled':
      return 'cancelled';
    case 'incomplete':
    case 'incomplete_expired':
    default:
      return 'incomplete';
  }
}
