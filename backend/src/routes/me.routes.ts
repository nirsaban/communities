import { Router } from 'express';
import * as meCtl from '../controllers/me.controller';
import { verifyToken } from '../middleware/auth';
import { readLimiter } from '../middleware/rateLimiter';

// Mounted under /api/v1/me alongside meNotificationsRouter / meSubscriptionsRouter.
export const meAggregatesRouter = Router();
meAggregatesRouter.use(verifyToken);
meAggregatesRouter.get('/rsvps', readLimiter, meCtl.listMyRsvps);
meAggregatesRouter.get('/communities', readLimiter, meCtl.listMyCommunities);
meAggregatesRouter.get('/managed-events', readLimiter, meCtl.listMyManagedEvents);
