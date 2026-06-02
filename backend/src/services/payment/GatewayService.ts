import mongoose, { Types } from 'mongoose';
import env from '../../config/env';
import logger from '../../config/logger';
import { AppError } from '../../utils/AppError';
import { Payment, IPayment } from '../../models/Payment';
import { Subscription, ISubscription, SubscriptionPlan } from '../../models/Subscription';
import { EventModel, IEvent } from '../../models/Event';
import { EventRSVP, IEventRSVP } from '../../models/EventRSVP';
import { Community, ICommunity } from '../../models/Community';
import type { IUser } from '../../models/User';
import { getNotificationService } from '../notification.service';
import {
  getPayPlusClient,
  PayPlusClient,
  PaymentMetadata,
  PaymentGatewayError,
} from './PayPlusClient';

/**
 * Single entry point for every PayPlus interaction. Controllers MUST go through
 * this service — never call `getPayPlusClient()` directly. Concentrates:
 *
 *   - persisting Payment / Subscription docs in `pending` / `incomplete` state
 *     BEFORE the network call so the webhook can correlate by id
 *   - mapping our domain (community, event, RSVP) onto PayPlus metadata
 *   - dispatching notifications on terminal state transitions
 *   - idempotent webhook event application (skip if Payment already final)
 */

const SUBSCRIPTION_PRICES_CENTS: Record<SubscriptionPlan, number> = {
  monthly: 4900, // 49 ILS / month
  annual: 49000, // 490 ILS / year (placeholder; annual ships in v1.5 per spec out-of-scope)
};

export interface EventCheckoutResult {
  paymentUrl: string;
  payment: IPayment;
}

export interface SubscriptionCheckoutResult {
  paymentUrl: string;
  subscription: ISubscription;
}

export class PaymentNotApplicableError extends AppError {
  constructor() {
    super('INVALID_INPUT', 'Event is free; no checkout required');
  }
}

function client(): PayPlusClient {
  return getPayPlusClient();
}

// ---------------------------------------------------------------------------
// Event checkout
// ---------------------------------------------------------------------------

export async function createEventCheckout(
  eventId: string,
  user: IUser,
): Promise<EventCheckoutResult> {
  if (!Types.ObjectId.isValid(eventId)) throw AppError.notFound('Event not found');
  const event = await EventModel.findById(eventId);
  if (!event) throw AppError.notFound('Event not found');
  if (event.status !== 'published') {
    throw AppError.invalidInput('Event is not open for RSVPs');
  }
  if (event.pricing.type !== 'paid' || (event.pricing.priceCents ?? 0) <= 0) {
    throw new PaymentNotApplicableError();
  }

  if (user.globalRole !== 'superadmin') {
    const { Membership } = await import('../../models/Membership');
    const membership = await Membership.findOne({
      userId: user._id,
      communityId: event.communityId,
      status: 'active',
    });
    if (!membership) throw AppError.unauthorized('Must be a member to checkout');
  }

  const existingPaid = await EventRSVP.findOne({
    eventId: event._id,
    userId: user._id,
    paymentStatus: 'paid',
    status: 'going',
  });
  if (existingPaid) throw AppError.conflict('You have already paid for this event');

  const community = await Community.findById(event.communityId);
  if (!community) throw AppError.notFound('Community not found');

  if (
    event.pricing.subscriptionIncluded &&
    (await hasActiveSubscription(user._id, event.communityId))
  ) {
    const rsvp = await placeSubscriptionRsvp(event, user._id);
    throw AppError.conflict(
      `Subscription already grants access; RSVP confirmed (status=${rsvp.status})`,
    );
  }

  const amountCents = event.pricing.priceCents ?? 0;
  const currency = event.pricing.currency || env.PAYMENT_CURRENCY;
  const maxInstallments = Math.min(
    event.pricing.maxInstallments ?? 1,
    env.PAYMENT_MAX_INSTALLMENTS,
  );

  // Persist a pending Payment row BEFORE the gateway call so the webhook can
  // correlate even if PayPlus replies before our Payment.save() completes.
  const payment = await Payment.create({
    communityId: event.communityId,
    userId: user._id,
    eventId: event._id,
    gateway: 'payplus',
    amountCents,
    currency,
    installments: 1,
    status: 'pending',
  });

  const metadata: PaymentMetadata = {
    paymentId: String(payment._id),
    communityId: String(event.communityId),
    userId: String(user._id),
    eventId: String(event._id),
    kind: 'event',
  };

  try {
    const page = await client().createPaymentPage({
      amountCents,
      currency,
      description: event.title,
      maxInstallments,
      successUrl: `${env.PLATFORM_PAYMENT_SUCCESS_URL}?ref=${String(payment._id)}`,
      failureUrl: `${env.PLATFORM_PAYMENT_FAILURE_URL}?ref=${String(payment._id)}`,
      notifyUrl: env.PLATFORM_PAYMENT_NOTIFY_URL,
      metadata,
      customerEmail: user.email,
    });
    payment.gatewayPaymentPageId = page.paymentPageUid;
    await payment.save();
    return { paymentUrl: page.paymentUrl, payment };
  } catch (err) {
    // Surface gateway failures as the original AppError so the controller emits a clean 502.
    if (err instanceof AppError) throw err;
    throw new PaymentGatewayError(
      `createEventCheckout failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Subscription checkout
// ---------------------------------------------------------------------------

export async function createSubscription(
  community: ICommunity,
  user: IUser,
  plan: SubscriptionPlan,
): Promise<SubscriptionCheckoutResult> {
  const existing = await Subscription.findOne({
    userId: user._id,
    communityId: community._id,
    status: { $in: ['active', 'past_due', 'incomplete'] },
  });
  if (existing) {
    throw AppError.conflict('You already have an active or pending subscription');
  }

  const amountCents = SUBSCRIPTION_PRICES_CENTS[plan];
  const currency = env.PAYMENT_CURRENCY;
  const intervalMonths = plan === 'annual' ? 12 : 1;

  const subscription = await Subscription.create({
    communityId: community._id,
    userId: user._id,
    gateway: 'payplus',
    plan,
    status: 'incomplete',
    failedAttempts: 0,
  });

  const metadata: PaymentMetadata = {
    subscriptionId: String(subscription._id),
    communityId: String(community._id),
    userId: String(user._id),
    kind: 'subscription',
  };

  try {
    const result = await client().createRecurring({
      amountCents,
      currency,
      description: `${community.name} — ${plan}`,
      intervalMonths,
      startDate: new Date(),
      notifyUrl: env.PLATFORM_PAYMENT_NOTIFY_URL,
      metadata,
      successUrl: `${env.PLATFORM_PAYMENT_SUCCESS_URL}?ref=${String(subscription._id)}`,
      failureUrl: `${env.PLATFORM_PAYMENT_FAILURE_URL}?ref=${String(subscription._id)}`,
      customerEmail: user.email,
    });
    subscription.gatewaySubscriptionId = result.recurringId;
    subscription.gatewayToken = result.token;
    await subscription.save();
    return { paymentUrl: result.paymentUrl, subscription };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new PaymentGatewayError(
      `createSubscription failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Cancel subscription
// ---------------------------------------------------------------------------

export async function cancelSubscriptionForUser(
  userId: Types.ObjectId,
  sid: string,
): Promise<ISubscription> {
  if (!Types.ObjectId.isValid(sid)) throw AppError.notFound('Subscription not found');
  const sub = await Subscription.findOne({ _id: sid, userId });
  if (!sub) throw AppError.notFound('Subscription not found');
  if (sub.status === 'cancelled') return sub;
  if (sub.gatewaySubscriptionId) {
    await client().cancelRecurring({ recurringId: sub.gatewaySubscriptionId });
  }
  // PayPlus accepts the cancel synchronously, but we keep status active until
  // currentPeriodEnd — the user paid for the period.
  sub.cancelAtPeriodEnd = true;
  await sub.save();
  return sub;
}

// ---------------------------------------------------------------------------
// Refund
// ---------------------------------------------------------------------------

export interface RefundOutcome {
  payment: IPayment;
  rsvp: IEventRSVP | null;
}

export async function issueRefund(
  pid: string,
  opts: { amountCents?: number; reason?: string },
): Promise<RefundOutcome> {
  if (!Types.ObjectId.isValid(pid)) throw AppError.notFound('Payment not found');
  const payment = await Payment.findById(pid);
  if (!payment) throw AppError.notFound('Payment not found');
  if (payment.status !== 'succeeded' && payment.status !== 'partial_refund') {
    throw AppError.invalidInput(`Cannot refund a payment in status ${payment.status}`);
  }
  if (!payment.gatewayTransactionId) {
    throw AppError.invalidInput('Payment has no gateway transaction to refund');
  }
  // Refund window: refundPolicyHours from createdAt. 0 / undefined = no window.
  if (payment.eventId) {
    const event = await EventModel.findById(payment.eventId);
    const hours = event?.pricing.refundPolicyHours ?? 0;
    if (hours > 0) {
      const cutoff = new Date(payment.createdAt.getTime() + hours * 60 * 60 * 1000);
      if (Date.now() > cutoff.getTime()) {
        throw AppError.invalidInput('Refund window has expired');
      }
    }
  }

  const remaining = payment.amountCents - payment.refundedAmountCents;
  const refundCents = opts.amountCents ?? remaining;
  if (refundCents <= 0 || refundCents > remaining) {
    throw AppError.invalidInput(
      `Refund amount ${refundCents} must be >0 and ≤ remaining ${remaining}`,
    );
  }

  const result = await client().refund({
    transactionId: payment.gatewayTransactionId,
    amountCents: refundCents,
    reason: opts.reason,
  });
  if (result.status !== 'succeeded') {
    throw new PaymentGatewayError('Refund was not approved by PayPlus');
  }

  payment.refundedAmountCents += refundCents;
  payment.status =
    payment.refundedAmountCents >= payment.amountCents ? 'refunded' : 'partial_refund';
  await payment.save();

  let rsvp: IEventRSVP | null = null;
  if (payment.status === 'refunded' && payment.eventId) {
    rsvp = await EventRSVP.findOne({ eventId: payment.eventId, userId: payment.userId });
    if (rsvp) {
      rsvp.status = 'cancelled';
      rsvp.paymentStatus = 'refunded';
      await rsvp.save();
      await getNotificationService().send({
        userId: rsvp.userId,
        communityId: payment.communityId,
        type: 'refund.received',
        title: 'התשלום הוחזר',
        body: 'בקשת ההחזר אושרה והכרטיס שלך זוכה.',
        payload: {
          paymentId: String(payment._id),
          eventId: String(payment.eventId),
          amountCents: refundCents,
        },
      });
    }
  }
  return { payment, rsvp };
}

// ---------------------------------------------------------------------------
// Webhook verification + dispatch
// ---------------------------------------------------------------------------

export interface WebhookEvent {
  id: string;
  type:
    | 'payment_success'
    | 'payment_failure'
    | 'recurring_payment_success'
    | 'recurring_payment_failure'
    | 'recurring_cancelled'
    | 'refund_success'
    | string;
  data: Record<string, unknown>;
}

export function verifyWebhook(rawBody: Buffer, signature: string): WebhookEvent {
  const ok = client().verifyWebhookSignature({ rawBody, signature });
  if (!ok) throw AppError.unauthorized('Invalid PayPlus webhook signature');
  let parsed: WebhookEvent;
  try {
    parsed = JSON.parse(rawBody.toString('utf8')) as WebhookEvent;
  } catch (err) {
    throw AppError.invalidInput(
      `PayPlus webhook body is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  if (!parsed || typeof parsed.type !== 'string') {
    throw AppError.invalidInput('PayPlus webhook missing event type');
  }
  return parsed;
}

export interface WebhookOutcome {
  type: string;
  handled: boolean;
  duplicate: boolean;
}

export async function applyWebhook(event: WebhookEvent): Promise<WebhookOutcome> {
  // Idempotency: webhook handlers below all short-circuit when target rows are
  // already in their terminal state.
  switch (event.type) {
    case 'payment_success':
      return onPaymentSuccess(event);
    case 'payment_failure':
      return onPaymentFailure(event);
    case 'recurring_payment_success':
      return onRecurringSuccess(event);
    case 'recurring_payment_failure':
      return onRecurringFailure(event);
    case 'recurring_cancelled':
      return onRecurringCancelled(event);
    case 'refund_success':
      return onRefundSuccess(event);
    default:
      logger.info({ msg: 'payplus.webhook.ignored', type: event.type });
      return { type: event.type, handled: false, duplicate: false };
  }
}

function extractMetadata(event: WebhookEvent): PaymentMetadata | null {
  const raw = event.data?.more_info ?? event.data?.metadata;
  if (!raw) return null;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as PaymentMetadata;
    } catch {
      return null;
    }
  }
  return raw as PaymentMetadata;
}

function txId(event: WebhookEvent): string | undefined {
  return (event.data?.transaction_uid ??
    event.data?.transaction_id ??
    event.data?.transactionId) as string | undefined;
}

async function onPaymentSuccess(event: WebhookEvent): Promise<WebhookOutcome> {
  const md = extractMetadata(event);
  const transactionId = txId(event);
  if (!md?.paymentId || !transactionId) {
    logger.warn({ msg: 'payplus.webhook.payment_success.missingIds', metadata: md, transactionId });
    return { type: event.type, handled: false, duplicate: false };
  }
  const payment = await Payment.findById(md.paymentId);
  if (!payment) return { type: event.type, handled: false, duplicate: false };
  if (payment.status === 'succeeded' || payment.status === 'refunded') {
    return { type: event.type, handled: true, duplicate: true };
  }
  await settleEventPayment({
    paymentId: String(payment._id),
    gatewayTransactionId: transactionId,
    installments: Number(event.data?.number_of_payments ?? 1),
  });
  return { type: event.type, handled: true, duplicate: false };
}

async function onPaymentFailure(event: WebhookEvent): Promise<WebhookOutcome> {
  const md = extractMetadata(event);
  if (!md?.paymentId) return { type: event.type, handled: false, duplicate: false };
  const payment = await Payment.findById(md.paymentId);
  if (!payment) return { type: event.type, handled: false, duplicate: false };
  if (payment.status === 'failed') return { type: event.type, handled: true, duplicate: true };
  if (payment.status !== 'pending') return { type: event.type, handled: false, duplicate: false };
  payment.status = 'failed';
  if (txId(event)) payment.gatewayTransactionId = txId(event);
  await payment.save();
  await getNotificationService().send({
    userId: payment.userId,
    communityId: payment.communityId,
    type: 'payment.failed',
    title: 'התשלום נכשל',
    body: 'לא הצלחנו לחייב את הכרטיס. נסה שוב או בחר אמצעי תשלום אחר.',
    payload: { paymentId: String(payment._id) },
  });
  return { type: event.type, handled: true, duplicate: false };
}

async function onRecurringSuccess(event: WebhookEvent): Promise<WebhookOutcome> {
  const md = extractMetadata(event);
  if (!md?.subscriptionId) return { type: event.type, handled: false, duplicate: false };
  const sub = await Subscription.findById(md.subscriptionId);
  if (!sub) return { type: event.type, handled: false, duplicate: false };
  // Idempotency: skip if currentPeriodEnd already covers "now+almost one month".
  const now = new Date();
  if (sub.currentPeriodEnd && sub.currentPeriodEnd.getTime() - now.getTime() > 28 * 86_400_000) {
    return { type: event.type, handled: true, duplicate: true };
  }
  const intervalMs = (sub.plan === 'annual' ? 365 : 30) * 86_400_000;
  sub.status = 'active';
  sub.currentPeriodStart = now;
  sub.currentPeriodEnd = new Date(now.getTime() + intervalMs);
  sub.failedAttempts = 0;
  await sub.save();

  const transactionId = txId(event);
  if (transactionId) {
    await Payment.create({
      communityId: sub.communityId,
      userId: sub.userId,
      subscriptionId: sub._id,
      gateway: 'payplus',
      gatewayTransactionId: transactionId,
      amountCents: Number(event.data?.amount ?? 0) * 100 || SUBSCRIPTION_PRICES_CENTS[sub.plan],
      currency: String(event.data?.currency_code ?? env.PAYMENT_CURRENCY),
      installments: 1,
      status: 'succeeded',
    });
  }
  await getNotificationService().send({
    userId: sub.userId,
    communityId: sub.communityId,
    type: 'subscription.renewed',
    title: 'המנוי חויב בהצלחה',
    payload: { subscriptionId: String(sub._id) },
  });
  return { type: event.type, handled: true, duplicate: false };
}

async function onRecurringFailure(event: WebhookEvent): Promise<WebhookOutcome> {
  const md = extractMetadata(event);
  if (!md?.subscriptionId) return { type: event.type, handled: false, duplicate: false };
  const sub = await Subscription.findById(md.subscriptionId);
  if (!sub) return { type: event.type, handled: false, duplicate: false };
  sub.failedAttempts += 1;
  if (sub.failedAttempts >= 3) {
    sub.status = 'past_due';
    await sub.save();
    await getNotificationService().send({
      userId: sub.userId,
      communityId: sub.communityId,
      type: 'subscription.past_due',
      title: 'המנוי בפיגור תשלום',
      body: 'נסיון החיוב נכשל. נסה שוב או עדכן את פרטי הכרטיס.',
      payload: { subscriptionId: String(sub._id), attempts: sub.failedAttempts },
    });
  } else {
    sub.status = sub.status === 'cancelled' ? 'cancelled' : 'past_due';
    await sub.save();
  }
  return { type: event.type, handled: true, duplicate: false };
}

async function onRecurringCancelled(event: WebhookEvent): Promise<WebhookOutcome> {
  const md = extractMetadata(event);
  if (!md?.subscriptionId) return { type: event.type, handled: false, duplicate: false };
  const sub = await Subscription.findById(md.subscriptionId);
  if (!sub) return { type: event.type, handled: false, duplicate: false };
  if (sub.status === 'cancelled') return { type: event.type, handled: true, duplicate: true };
  sub.status = 'cancelled';
  await sub.save();
  await getNotificationService().send({
    userId: sub.userId,
    communityId: sub.communityId,
    type: 'subscription.cancelled',
    title: 'המנוי בוטל',
    payload: { subscriptionId: String(sub._id) },
  });
  return { type: event.type, handled: true, duplicate: false };
}

async function onRefundSuccess(event: WebhookEvent): Promise<WebhookOutcome> {
  const txnId = (event.data?.related_transaction ?? txId(event)) as string | undefined;
  if (!txnId) return { type: event.type, handled: false, duplicate: false };
  const payment = await Payment.findOne({ gatewayTransactionId: txnId });
  if (!payment) return { type: event.type, handled: false, duplicate: false };
  const refundedAmount = Math.round(Number(event.data?.amount ?? 0) * 100);
  if (payment.refundedAmountCents >= payment.amountCents) {
    return { type: event.type, handled: true, duplicate: true };
  }
  payment.refundedAmountCents = Math.max(payment.refundedAmountCents, refundedAmount);
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
  return { type: event.type, handled: true, duplicate: false };
}

// ---------------------------------------------------------------------------
// Helpers shared with RSVP service + webhook handlers
// ---------------------------------------------------------------------------

export async function hasActiveSubscription(
  userId: Types.ObjectId,
  communityId: Types.ObjectId,
): Promise<boolean> {
  const sub = await Subscription.findOne({ userId, communityId, status: 'active' });
  return !!sub;
}

async function placeSubscriptionRsvp(
  event: IEvent,
  userId: Types.ObjectId,
): Promise<IEventRSVP> {
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

interface SettleArgs {
  paymentId: string;
  gatewayTransactionId: string;
  installments?: number;
}

export async function settleEventPayment(args: SettleArgs): Promise<
  { payment: IPayment; rsvp: IEventRSVP } | null
> {
  const payment = await Payment.findById(args.paymentId);
  if (!payment) return null;
  if (payment.status === 'succeeded') {
    const rsvp = payment.rsvpId
      ? await EventRSVP.findById(payment.rsvpId)
      : await EventRSVP.findOne({ eventId: payment.eventId, userId: payment.userId });
    return rsvp ? { payment, rsvp } : null;
  }
  if (!payment.eventId) {
    payment.status = 'succeeded';
    payment.gatewayTransactionId = args.gatewayTransactionId;
    if (args.installments) payment.installments = args.installments;
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
          {
            $inc: {
              'metrics.rsvpCount': 1,
              'metrics.paidCount': 1,
              'metrics.totalRevenueCents': payment.amountCents,
            },
          },
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
      payment.gatewayTransactionId = args.gatewayTransactionId;
      if (args.installments) payment.installments = args.installments;
      await payment.save({ session });
      outcome = { rsvp };
    });
    const result = outcome as { rsvp: IEventRSVP } | null;
    if (result) {
      await getNotificationService().send({
        userId: payment.userId,
        communityId: payment.communityId,
        type: 'payment.succeeded',
        title: 'התשלום אושר',
        body: 'התשלום עבור האירוע אושר ומקומך נשמר.',
        payload: {
          paymentId: String(payment._id),
          eventId: String(payment.eventId),
        },
      });
    }
    return result ? { payment, rsvp: result.rsvp } : null;
  } finally {
    session.endSession();
  }
}
