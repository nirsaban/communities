// Importing this module sets up the test app and registers DB cleanup hooks
// (afterEach: clear all collections; afterAll: disconnect).
import { afterEach, afterAll, beforeAll } from '@jest/globals';
import { connectDB, mongoose } from '../../src/config/db';
import { buildApp } from '../../src/app';

let appPromise: Promise<ReturnType<typeof buildApp>> | null = null;

export async function getApp(): Promise<ReturnType<typeof buildApp>> {
  if (!appPromise) {
    appPromise = (async () => {
      if (mongoose.connection.readyState === 0) {
        await connectDB(process.env.MONGO_URI as string);
      }
      return buildApp();
    })();
  }
  return appPromise;
}

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await connectDB(process.env.MONGO_URI as string);
  }
});

afterEach(async () => {
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});
