import { afterEach, afterAll } from '@jest/globals';
import { mongoose } from '../src/config/db';

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
