import type { MongoMemoryReplSet } from 'mongodb-memory-server';

declare global {
  // eslint-disable-next-line no-var
  var __MONGO_REPL__: MongoMemoryReplSet | undefined;
}

export default async function globalTeardown(): Promise<void> {
  if (global.__MONGO_REPL__) {
    await global.__MONGO_REPL__.stop();
    global.__MONGO_REPL__ = undefined;
  }
}
