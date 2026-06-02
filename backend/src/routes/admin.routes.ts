import { Router } from 'express';
import * as adminCtl from '../controllers/admin.controller';
import { verifyToken } from '../middleware/auth';
import {
  loadMembership,
  requireCommunityRole,
  blockSubAdminFromFinancial,
} from '../middleware/role';
import { readLimiter, writeLimiter } from '../middleware/rateLimiter';

// Mounted under /api/v1/communities.
// Sub-admin AND admin both reach these screens. Financial endpoints stay separate
// and are protected by `blockSubAdminFromFinancial` on their own routes.
export const communityAdminRouter = Router({ mergeParams: true });
communityAdminRouter.use(
  '/:cid/admin',
  verifyToken,
  loadMembership('cid'),
  requireCommunityRole('admin', 'subadmin'),
);

communityAdminRouter.get('/:cid/admin/overview', readLimiter, adminCtl.overview);
communityAdminRouter.get('/:cid/admin/analytics/attendance', readLimiter, adminCtl.attendance);
communityAdminRouter.get('/:cid/admin/analytics/growth', readLimiter, adminCtl.growth);
communityAdminRouter.get('/:cid/admin/analytics/most-active', readLimiter, adminCtl.mostActive);

communityAdminRouter.get('/:cid/admin/members/pending', readLimiter, adminCtl.pendingMembers);
communityAdminRouter.post(
  '/:cid/admin/members/:uid/approve',
  writeLimiter,
  adminCtl.approveMember,
);
communityAdminRouter.post(
  '/:cid/admin/members/:uid/reject',
  writeLimiter,
  adminCtl.rejectMember,
);
communityAdminRouter.get('/:cid/admin/members/:uid', readLimiter, adminCtl.memberDetail);

communityAdminRouter.get('/:cid/admin/moderation', readLimiter, adminCtl.moderationQueue);

// Admin-only financial surface (sub-admin blocked).
communityAdminRouter.get(
  '/:cid/admin/subscriptions',
  blockSubAdminFromFinancial,
  requireCommunityRole('admin'),
  readLimiter,
  adminCtl.listCommunitySubscriptions,
);

// Sanity belt-and-suspenders: ensure no financial endpoint is mounted on this
// router by mistake. (blockSubAdminFromFinancial will already 403 if it ever did.)
communityAdminRouter.use('/:cid/admin/finances', blockSubAdminFromFinancial, (_req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Financial routes live under /finances' } });
});
