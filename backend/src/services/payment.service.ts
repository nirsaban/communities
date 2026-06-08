import { Types } from 'mongoose';
import { Payment } from '../models/Payment';
import { Subscription, ISubscription, SubscriptionPlan } from '../models/Subscription';
import { EventModel } from '../models/Event';
import { Community, ICommunity } from '../models/Community';
import { AppError } from '../utils/AppError';
import { cursorFilter, nextCursorFor, parsePagination } from '../utils/pagination';
import { User, type IUser } from '../models/User';
import env from '../config/env';
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
  // Last-30 net revenue (what the dashboard surfaces as the headline).
  last30RevenueCents: number;
  // Sum of upcoming paid-event capacity × price (open RSVPs not yet realized).
  upcomingRevenueCents: number;
  // Active community subscriptions count.
  activeSubscriptions: number;
  // Monthly recurring revenue (cents). Sum of monthly plan prices for active subs
  // + (1/12) of annual plan prices, prorated.
  mrrCents: number;
  revenueByEvent: Array<{
    eventId: string;
    title: string;
    revenueCents: number;
    paidCount: number;
  }>;
  // 6-month bar chart series (oldest first).
  monthlySeries: Array<{ month: string; revenueCents: number }>;
  // Subscription revenue (sum of active subs).
  subscriptionRevenueCents: number;
  // Recent payments for the right-rail list.
  recentPayments: Array<{
    id: string;
    amountCents: number;
    status: string;
    createdAt: Date;
    payer?: { id: string; name?: string; email?: string } | null;
    eventId?: string | null;
    eventTitle?: string | null;
  }>;
}

export async function computeFinancials(communityId: Types.ObjectId): Promise<FinancialSnapshot> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - 7);
  const startLast30 = new Date(now);
  startLast30.setDate(now.getDate() - 30);
  // Start of the 6-month window — first day of the month 5 months ago.
  const startSixMonths = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    totals,
    monthAgg,
    weekAgg,
    last30Agg,
    activeSubsCount,
    byEvent,
    monthlySeriesAgg,
    recentPayments,
    upcomingEvents,
    activeSubsRows,
  ] = await Promise.all([
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
    Payment.aggregate<{ _id: null; sum: number }>([
      {
        $match: {
          communityId,
          status: { $in: ['succeeded', 'partial_refund'] },
          createdAt: { $gte: startLast30 },
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
    Payment.aggregate<{ _id: string; sum: number }>([
      {
        $match: {
          communityId,
          status: { $in: ['succeeded', 'partial_refund'] },
          createdAt: { $gte: startSixMonths },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          sum: { $sum: { $subtract: ['$amountCents', '$refundedAmountCents'] } },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Payment.find({ communityId, status: { $in: ['succeeded', 'partial_refund', 'refunded'] } })
      .sort({ createdAt: -1 })
      .limit(8)
      .lean(),
    EventModel.find({
      communityId,
      status: 'published',
      startAt: { $gte: now },
      'pricing.type': 'paid',
    })
      .select({ title: 1, capacity: 1, 'pricing.priceCents': 1 })
      .lean(),
    Subscription.find({ communityId, status: 'active' }).select({ plan: 1 }).lean(),
  ]);

  const eventIds = byEvent.map((r) => r._id);
  const events = await EventModel.find({ _id: { $in: eventIds } }, { title: 1 }).lean();
  const titleMap = new Map(events.map((e) => [String(e._id), e.title]));

  // Hydrate payment payer names and event titles for recent payments.
  const payerIds = Array.from(new Set(recentPayments.map((p) => String(p.userId))));
  const payerEventIds = Array.from(
    new Set(recentPayments.filter((p) => p.eventId).map((p) => String(p.eventId))),
  );
  const [payers, payerEvents] = await Promise.all([
    payerIds.length
      ? User.find({ _id: { $in: payerIds } }, { name: 1, email: 1 }).lean()
      : Promise.resolve([] as Array<{ _id: Types.ObjectId; name?: string; email?: string }>),
    payerEventIds.length
      ? EventModel.find({ _id: { $in: payerEventIds } }, { title: 1 }).lean()
      : Promise.resolve([] as Array<{ _id: Types.ObjectId; title: string }>),
  ]);
  const payerMap = new Map(payers.map((u) => [String(u._id), u]));
  const payerEventMap = new Map(payerEvents.map((e) => [String(e._id), e]));

  // Build the 6-month series with zero-fills.
  const monthlyMap = new Map(monthlySeriesAgg.map((r) => [r._id, r.sum]));
  const monthlySeries: Array<{ month: string; revenueCents: number }> = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthlySeries.push({ month: key, revenueCents: monthlyMap.get(key) ?? 0 });
  }

  // MRR — sum monthly equivalent of every active subscription.
  // Prefer the community's configured plan prices; fall back to env defaults so
  // legacy communities without a plan still produce a non-zero MRR.
  const planCommunity = await Community.findById(communityId)
    .select({ 'subscriptionPlans.monthlyPriceCents': 1, 'subscriptionPlans.annualPriceCents': 1 })
    .lean();
  const monthlyPriceCents =
    planCommunity?.subscriptionPlans?.monthlyPriceCents ??
    Number((env as Record<string, unknown>).SUBSCRIPTION_MONTHLY_CENTS ?? 2900);
  const annualPriceCents =
    planCommunity?.subscriptionPlans?.annualPriceCents ??
    Number((env as Record<string, unknown>).SUBSCRIPTION_ANNUAL_CENTS ?? 29000);
  let mrrCents = 0;
  let subscriptionRevenueCents = 0;
  for (const sub of activeSubsRows) {
    const plan = (sub.plan ?? 'monthly') as SubscriptionPlan;
    if (plan === 'monthly') {
      mrrCents += monthlyPriceCents;
      subscriptionRevenueCents += monthlyPriceCents;
    } else {
      mrrCents += Math.round(annualPriceCents / 12);
      subscriptionRevenueCents += annualPriceCents;
    }
  }

  // Upcoming pipeline (paid events) — capacity × price for events that haven't started.
  let upcomingRevenueCents = 0;
  for (const ev of upcomingEvents) {
    const cap = typeof ev.capacity === 'number' && ev.capacity > 0 ? ev.capacity : 0;
    const price = ev.pricing?.priceCents ?? 0;
    upcomingRevenueCents += cap * price;
  }

  return {
    totalRevenueCents: totals[0]?.sum ?? 0,
    revenueThisMonth: monthAgg[0]?.sum ?? 0,
    revenueThisWeek: weekAgg[0]?.sum ?? 0,
    last30RevenueCents: last30Agg[0]?.sum ?? 0,
    upcomingRevenueCents,
    activeSubscriptions: activeSubsCount,
    mrrCents,
    subscriptionRevenueCents,
    monthlySeries,
    revenueByEvent: byEvent.map((r) => ({
      eventId: String(r._id),
      title: titleMap.get(String(r._id)) ?? '(deleted event)',
      revenueCents: r.revenueCents,
      paidCount: r.paidCount,
    })),
    recentPayments: recentPayments.map((p) => {
      const payer = payerMap.get(String(p.userId));
      const event = p.eventId ? payerEventMap.get(String(p.eventId)) : null;
      return {
        id: String(p._id),
        amountCents: p.amountCents,
        status: p.status,
        createdAt: p.createdAt,
        payer: payer
          ? { id: String(payer._id), name: payer.name, email: payer.email }
          : null,
        eventId: p.eventId ? String(p.eventId) : null,
        eventTitle: event?.title ?? null,
      };
    }),
  };
}

// Keep a community lookup helper exported for tests + the admin controller.
export async function loadCommunityOrThrow(communityId: Types.ObjectId): Promise<ICommunity> {
  const c = await Community.findById(communityId);
  if (!c) throw AppError.notFound('Community not found');
  return c;
}
