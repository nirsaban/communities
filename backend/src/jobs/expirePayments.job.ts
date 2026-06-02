import cron from 'node-cron';
import env from '../config/env';
import logger from '../config/logger';
import { Payment } from '../models/Payment';

const STALE_AFTER_MS = 30 * 60 * 1000; // 30 minutes

/**
 * PayPlus hosted pages expire (and the user gives up) after a while. Any
 * Payment row stuck in `pending` for >30 minutes is unrecoverable — flip it
 * to `failed` so the mobile poll loop terminates and the user can retry.
 *
 * Exported so the integration tests can run it deterministically.
 */
export async function expireStalePendingPayments(): Promise<{ expired: number }> {
  const cutoff = new Date(Date.now() - STALE_AFTER_MS);
  const result = await Payment.updateMany(
    { status: 'pending', createdAt: { $lt: cutoff } },
    { $set: { status: 'failed' } },
  );
  const expired = result.modifiedCount ?? 0;
  if (expired > 0) {
    logger.info({ msg: 'expirePayments.expired', count: expired });
  }
  return { expired };
}

export function startExpirePaymentsJob(): cron.ScheduledTask | null {
  if (env.isTest) return null;
  // Every 15 minutes.
  const task = cron.schedule('*/15 * * * *', () => {
    expireStalePendingPayments().catch((err) => {
      logger.error({
        msg: 'expirePayments.job.fatal',
        err: err instanceof Error ? err.message : String(err),
      });
    });
  });
  logger.info({ msg: 'expirePayments.job.scheduled', cron: '*/15 * * * *' });
  return task;
}
