import { Router } from 'express';
import * as superCtl from '../controllers/super.controller';
import { verifyToken } from '../middleware/auth';
import { requireGlobalRole } from '../middleware/role';
import { validate } from '../middleware/validate';
import { writeLimiter, readLimiter } from '../middleware/rateLimiter';
import {
  createCommunitySchema,
  updateCommunitySchema,
  listQuerySchema,
} from '../validators/community.validator';

const router = Router();

router.use(verifyToken, requireGlobalRole('superadmin'));

router.get('/communities', readLimiter, validate(listQuerySchema, 'query'), superCtl.list);
router.post('/communities', writeLimiter, validate(createCommunitySchema), superCtl.create);
router.get('/communities/:cid', readLimiter, superCtl.detail);
router.patch('/communities/:cid', writeLimiter, validate(updateCommunitySchema), superCtl.update);
router.post('/communities/:cid/suspend', writeLimiter, superCtl.suspend);
router.post('/communities/:cid/restore', writeLimiter, superCtl.restore);
router.delete('/communities/:cid', writeLimiter, superCtl.remove);

// C7: platform stats + global users + platform settings.
router.get('/stats', readLimiter, superCtl.stats);
router.get('/users', readLimiter, superCtl.listUsers);
router.get('/users/:uid', readLimiter, superCtl.userDetail);
router.post('/users/:uid/disable', writeLimiter, superCtl.disableUser);
router.post('/users/:uid/enable', writeLimiter, superCtl.enableUser);
router.post('/users/:uid/promote', writeLimiter, superCtl.promoteUser);
router.post('/users/:uid/reset-password', writeLimiter, superCtl.forcePasswordReset);
router.get('/audit', readLimiter, superCtl.audit);
router.get('/settings', readLimiter, superCtl.getPlatformSettings);
router.patch('/settings', writeLimiter, superCtl.updatePlatformSettings);

export default router;
