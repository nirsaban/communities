import { Router } from 'express';
import { getDb } from '../lib/mongo.js';

const router = Router();

const KNOWN_COLLECTIONS = [
  'users',
  'communities',
  'memberships',
  'events',
  'eventrsvps',
  'eventqas',
  'initiatives',
  'applications',
  'posts',
  'comments',
  'invitations',
  'notifications',
  'payments',
  'subscriptions',
  'materials',
  'refreshtokens',
  'auditlogs',
];

router.get('/db/collections', async (_req, res, next) => {
  try {
    const db = await getDb();
    const all = await db.listCollections().toArray();
    const present = new Set(all.map((c) => c.name));
    const merged = Array.from(new Set([...KNOWN_COLLECTIONS, ...present]));
    const rows = await Promise.all(
      merged.map(async (name) => {
        if (!present.has(name)) return { name, exists: false, count: 0 };
        try {
          const count = await db.collection(name).estimatedDocumentCount();
          return { name, exists: true, count };
        } catch {
          return { name, exists: true, count: -1 };
        }
      }),
    );
    rows.sort((a, b) => Number(b.exists) - Number(a.exists) || b.count - a.count);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.get('/db/server-info', async (_req, res, next) => {
  try {
    const db = await getDb();
    const [serverStatus, dbStats] = await Promise.all([
      db.command({ serverStatus: 1 }).catch(() => null),
      db.stats().catch(() => null),
    ]);
    res.json({
      data: {
        host: serverStatus?.host ?? null,
        version: serverStatus?.version ?? null,
        uptimeSec: serverStatus?.uptime ?? null,
        connections: serverStatus?.connections ?? null,
        dbName: db.databaseName,
        dbSizeBytes: dbStats?.dataSize ?? null,
        storageBytes: dbStats?.storageSize ?? null,
        collections: dbStats?.collections ?? null,
        indexes: dbStats?.indexes ?? null,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
