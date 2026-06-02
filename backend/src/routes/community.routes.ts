import { Router } from 'express';
import * as communityCtl from '../controllers/community.controller';
import { verifyToken } from '../middleware/auth';
import { loadMembership, requireCommunityRole } from '../middleware/role';
import { validate } from '../middleware/validate';
import { writeLimiter, readLimiter } from '../middleware/rateLimiter';
import {
  updateCommunitySchema,
  onboardCommunitySchema,
  inviteMemberSchema,
  changeMemberRoleSchema,
  listQuerySchema,
} from '../validators/community.validator';

const router = Router({ mergeParams: true });

router.use('/:cid', verifyToken, loadMembership('cid'));

router.get('/:cid', readLimiter, communityCtl.detail);
router.patch(
  '/:cid',
  writeLimiter,
  requireCommunityRole('admin'),
  validate(updateCommunitySchema),
  communityCtl.update,
);
router.post(
  '/:cid/onboard',
  writeLimiter,
  requireCommunityRole('admin'),
  validate(onboardCommunitySchema),
  communityCtl.onboard,
);

router.get(
  '/:cid/members',
  readLimiter,
  requireCommunityRole('admin', 'subadmin'),
  validate(listQuerySchema, 'query'),
  communityCtl.members,
);
router.post(
  '/:cid/members/invite',
  writeLimiter,
  requireCommunityRole('admin', 'subadmin'),
  validate(inviteMemberSchema),
  communityCtl.invite,
);
router.patch(
  '/:cid/members/:uid',
  writeLimiter,
  requireCommunityRole('admin', 'subadmin'),
  validate(changeMemberRoleSchema),
  communityCtl.changeRole,
);
router.delete(
  '/:cid/members/:uid',
  writeLimiter,
  requireCommunityRole('admin', 'subadmin'),
  communityCtl.removeOne,
);

// Any active member can acknowledge the community rules. Sets the timestamp on
// the requester's own membership row.
router.post(
  '/:cid/rules/ack',
  writeLimiter,
  communityCtl.acknowledgeRules,
);

export default router;
