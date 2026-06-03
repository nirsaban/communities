import { Types } from 'mongoose';
import { Payment } from '../models/Payment';
import { Subscription, ISubscription, SubscriptionPlan } from '../models/Subscription';
import { EventModel } from '../models/Event';
import { Community, ICommunity } from '../models/Community';
import { AppError } from '../utils/AppError';
import { cursorFilter, nextCursorFor, parsePagination } from '../utils/pagination';
import type { IUser } from '../models/User';
import {
  createEventCheckout,
  createSubscription,
  cancelSubscriptionForUser,
  issueRefund,
  hasActiveSubscription,
  EventCheckoutResult,
  SubscriptionCheckoutResult,
  RefundOutcome,
  PaymentNotApplicableError,
} from './payment/GatewayService';

export { PaymentNotApplicableError, hasActiveSubscription };

/**
 * Public surface used by controllers. Thin orchestration around `GatewayService`
 * (the only module allowed to talk to PayPlus) plus read-side helpers
 * (list, financials, my subscriptions).
 */

export interface CheckoutResult {
  paymentUrl: string;
  payment: EventCheckoutResult['payment'];
}

export async function startEventCheckout(eid: string, user: IUser): Promise<CheckoutResult> {
  const result = await createEventCheckout(eid, user);
  return { paymentUrl: result.paymentUrl, payment: result.payment };
}

export async function startSubscriptionCheckout(
  community: ICommunity,
  user: IUser,
  plan: SubscriptionPlan,
): Promise<{ paymentUrl: string; subscription: SubscriptionCheckoutResult['subscription'] }> {
  const result = await createSubscription(community, user, plan);
  return { paymentUrl: result.paymentUrl, subscription: result.subscription };
}

export async function listMySubscriptions(userId: Types.ObjectId): Promise<ISubscription[]> {
  return Subscription.find({
    userId,
    status: { $in: ['active', 'past_due', 'incomplete'] },
  })
    .sort({ createdAt: -1 });
}

export async function cancelMySubscription(
  userId: Types.ObjectId,
  sid: string,
): Promise<ISubscription> {
  return cancelSubscriptionForUser(userId, sid);
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

export async function refundPayment(
  pid: string,
  opts: { amountCents?: number; reason?: string },
): Promise<RefundOutcome> {
  return issueRefund(pid, opts);
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

// Keep a community lookup helper exported for tests + the admin controller.
export async function loadCommunityOrThrow(communityId: Types.ObjectId): Promise<ICommunity> {
  const c = await Community.findById(communityId);
  if (!c) throw AppError.notFound('Community not found');
  return c;
}
