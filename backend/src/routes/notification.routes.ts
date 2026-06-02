import { Router } from 'express';
import * as notifCtl from '../controllers/notification.controller';
import { verifyToken } from '../middleware/auth';
import { readLimiter, writeLimiter } from '../middleware/rateLimiter';

// Mounted under /api/v1/me.
export const meNotificationsRouter = Router();
meNotificationsRouter.use(verifyToken);
meNotificationsRouter.get('/notifications', readLimiter, notifCtl.list);
meNotificationsRouter.patch(
  '/notifications/read-all',
  writeLimiter,
  notifCtl.markAllRead,
);
meNotificationsRouter.patch(
  '/notifications/:nid/read',
  writeLimiter,
  notifCtl.markRead,
);
meNotificationsRouter.get(
  '/notification-preferences',
  readLimiter,
  notifCtl.getPreferences,
);
meNotificationsRouter.patch(
  '/notification-preferences',
  writeLimiter,
  notifCtl.updatePreferences,
);
