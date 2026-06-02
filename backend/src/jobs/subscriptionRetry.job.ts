import cron from 'node-cron';
import env from '../config/env';
import logger from '../config/logger';
import { Subscription } from '../models/Subscription';
import { Payment } from '../models/Payment';
import { getPayPlusClient, PaymentMetadata } from '../services/payment/PayPlusClient';
import { getNotificationService } from '../services/notification.service';

const MAX_ATTEMPTS = 3;
// Subscription plan → re-charge price (kept in sync with GatewayService).
const PRICES_CENTS: Record<'monthly' | 'annual', number> = {
  monthly: 4900,
  annual: 49000,
};

/**
 * Walk every subscription in `past_due` with `failedAttempts < 3` and attempt
 * to charge the saved PayPlus token. On success → reset attempts, extend the
 * period, mark active. On failure → bump attempts; at >=3, mark cancelled and
 * notify the user.
 *
 * Exported so the integration tests can invoke it directly without waiting on
 * cron.
 */
export async function runSubscriptionRetries(): Promise<{
  attempted: number;
  succeeded: number;
  failed: number;
  cancelled: number;
}> {
  const stats = { attempted: 0, succeeded: 0, failed: 0, cancelled: 0 };
  const candidates = await Subscription.find({
    status: 'past_due',
    failedAttempts: { $lt: MAX_ATTEMPTS },
  }).select('+gatewayToken');

  const client = getPayPlusClient();
  for (const sub of candidates) {
    if (!sub.gatewayToken) {
      logger.warn({
        msg: 'subscriptionRetry.skip.noToken',
        subscriptionId: String(sub._id),
      });
      continue;
    }
    stats.attempted += 1;
    const amountCents = PRICES_CENTS[sub.plan];
    const metadata: PaymentMetadata = {
      subscriptionId: String(sub._id),
      communityId: String(sub.communityId),
      userId: String(sub.userId),
      kind: 'token_charge',
    };
    try {
      const result = await client.chargeToken({
        token: sub.gatewayToken,
        amountCents,
        currency: env.PAYMENT_CURRENCY,
        description: `Subscription retry ${sub.plan}`,
        metadata,
      });
      if (result.status === 'succeeded') {
        const now = new Date();
        const intervalMs = (sub.plan === 'annual' ? 365 : 30) * 86_400_000;
        sub.status = 'active';
        sub.failedAttempts = 0;
        sub.currentPeriodStart = now;
        sub.currentPeriodEnd = new Date(now.getTime() + intervalMs);
        await sub.save();
        await Payment.create({
          communityId: sub.communityId,
          userId: sub.userId,
          subscriptionId: sub._id,
          gateway: 'payplus',
          gatewayTransactionId: result.transactionId,
          amountCents,
          currency: env.PAYMENT_CURRENCY,
          installments: 1,
          status: 'succeeded',
        });
        stats.succeeded += 1;
        await getNotificationService().send({
          userId: sub.userId,
          communityId: sub.communityId,
          type: 'subscription.recovered',
          title: 'המנוי חויב בהצלחה',
          payload: { subscriptionId: String(sub._id) },
        });
      } else {
        await bumpFailure(sub, stats);
      }
    } catch (err) {
      logger.error({
        msg: 'subscriptionRetry.error',
        subscriptionId: String(sub._id),
        err: err instanceof Error ? err.message : String(err),
      });
      await bumpFailure(sub, stats);
    }
  }
  logger.info({ msg: 'subscriptionRetry.complete', ...stats });
  return stats;
}

async function bumpFailure(
  sub: { failedAttempts: number; status: string; save: () => Promise<unknown>; _id: unknown; userId: unknown; communityId: unknown },
  stats: { failed: number; cancelled: number },
): Promise<void> {
  sub.failedAttempts += 1;
  if (sub.failedAttempts >= MAX_ATTEMPTS) {
    sub.status = 'cancelled';
    await sub.save();
    stats.cancelled += 1;
    await getNotificationService().send({
      userId: sub.userId as never,
      communityId: sub.communityId as never,
      type: 'subscription.cancelled.maxFailures',
      title: 'המנוי בוטל',
      body: 'לא הצלחנו לחייב את הכרטיס לאחר 3 ניסיונות.',
      payload: { subscriptionId: String(sub._id) },
    });
  } else {
    await sub.save();
    stats.failed += 1;
  }
}

export function startSubscriptionRetryJob(): cron.ScheduledTask | null {
  if (env.isTest) return null;
  // Every 24 hours at 04:00 server time.
  const task = cron.schedule('0 4 * * *', () => {
    runSubscriptionRetries().catch((err) => {
      logger.error({
        msg: 'subscriptionRetry.job.fatal',
        err: err instanceof Error ? err.message : String(err),
      });
    });
  });
  logger.info({ msg: 'subscriptionRetry.job.scheduled', cron: '0 4 * * *' });
  return task;
}
