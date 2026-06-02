import { MongoMemoryReplSet } from 'mongodb-memory-server';

declare global {
  // eslint-disable-next-line no-var
  var __MONGO_REPL__: MongoMemoryReplSet | undefined;
}

export default async function globalSetup(): Promise<void> {
  // Replica set is required for Mongoose transactions used in the app.
  const repl = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
  });
  global.__MONGO_REPL__ = repl;
  process.env.MONGO_URI = repl.getUri('community-test');
}
