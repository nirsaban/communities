import mongoose from 'mongoose';
import env from './env';
import logger from './logger';

mongoose.set('strictQuery', true);

export interface ConnectOptions {
  maxRetries?: number;
}

export async function connectDB(
  uri: string = env.MONGO_URI,
  opts: ConnectOptions = {},
): Promise<mongoose.Connection> {
  const maxRetries = opts.maxRetries ?? (env.isTest ? 1 : 8);
  let attempt = 0;
  let lastErr: unknown;
  while (attempt < maxRetries) {
    attempt += 1;
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
      });
      logger.info({ msg: 'mongo.connected', host: mongoose.connection.host });
      return mongoose.connection;
    } catch (err) {
      lastErr = err;
      const backoff = Math.min(1000 * 2 ** (attempt - 1), 15_000);
      logger.warn({
        msg: 'mongo.connect.retry',
        attempt,
        backoff,
        err: err instanceof Error ? err.message : String(err),
      });
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
  throw lastErr;
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}

export { mongoose };
