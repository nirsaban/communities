import { buildApp } from './app';
import env from './config/env';
import logger from './config/logger';
import { connectDB, disconnectDB } from './config/db';
import { startRecurringEventsJob } from './jobs/recurringEvents.job';

async function main(): Promise<void> {
  await connectDB();
  startRecurringEventsJob();
  const app = buildApp();
  const server = app.listen(env.PORT, () => {
    logger.info({ msg: 'server.listening', port: env.PORT, env: env.NODE_ENV });
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ msg: 'server.shutdown', signal });
    server.close(() => {});
    await disconnectDB();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error({ msg: 'server.boot.failed', err: err instanceof Error ? err.message : err });
  process.exit(1);
});
