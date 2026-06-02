import cron from 'node-cron';
import { EventModel } from '../models/Event';
import { materializeInstances } from '../services/recurring.service';
import logger from '../config/logger';
import env from '../config/env';

const HORIZON_DAYS = 60;

/**
 * Find every active recurring parent and top up its 60-day horizon. Idempotent
 * (the service skips dates that already have an instance) so a re-run is safe.
 */
export async function materializeAllRecurringParents(): Promise<{
  parentsScanned: number;
  instancesCreated: number;
}> {
  let parentsScanned = 0;
  let instancesCreated = 0;
  const parents = await EventModel.find({
    type: 'recurring_parent',
    status: { $in: ['published', 'draft'] },
  }).select({ _id: 1 });
  for (const p of parents) {
    parentsScanned += 1;
    try {
      const created = await materializeInstances(p._id, { horizonDays: HORIZON_DAYS });
      instancesCreated += created.length;
    } catch (err) {
      logger.error({
        msg: 'recurringEvents.job.parent.failed',
        parentId: String(p._id),
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }
  logger.info({
    msg: 'recurringEvents.job.complete',
    parentsScanned,
    instancesCreated,
  });
  return { parentsScanned, instancesCreated };
}

export function startRecurringEventsJob(): cron.ScheduledTask | null {
  if (env.isTest) return null;
  // Daily at 03:00 server time.
  const task = cron.schedule('0 3 * * *', () => {
    materializeAllRecurringParents().catch((err) => {
      logger.error({
        msg: 'recurringEvents.job.fatal',
        err: err instanceof Error ? err.message : String(err),
      });
    });
  });
  logger.info({ msg: 'recurringEvents.job.scheduled', cron: '0 3 * * *' });
  return task;
}
