import { Router } from 'express';
import * as meCtl from '../controllers/me.controller';
import { verifyToken } from '../middleware/auth';
import { readLimiter, writeLimiter } from '../middleware/rateLimiter';

// Mounted under /api/v1/me alongside meNotificationsRouter / meSubscriptionsRouter.
export const meAggregatesRouter = Router();
meAggregatesRouter.use(verifyToken);
meAggregatesRouter.get('/rsvps', readLimiter, meCtl.listMyRsvps);
meAggregatesRouter.get('/communities', readLimiter, meCtl.listMyCommunities);
meAggregatesRouter.get('/managed-events', readLimiter, meCtl.listMyManagedEvents);
meAggregatesRouter.get('/privacy', readLimiter, meCtl.getPrivacy);
meAggregatesRouter.patch('/privacy', writeLimiter, meCtl.updatePrivacy);
