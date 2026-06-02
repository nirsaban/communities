import { Router } from 'express';
import * as initCtl from '../controllers/initiative.controller';
import { verifyToken } from '../middleware/auth';
import { loadMembership } from '../middleware/role';
import { validate } from '../middleware/validate';
import { readLimiter, writeLimiter } from '../middleware/rateLimiter';
import {
  createInitiativeSchema,
  updateInitiativeSchema,
  rejectInitiativeSchema,
  addContributorSchema,
  completeInitiativeSchema,
  createCommentSchema,
  listInitiativesQuerySchema,
} from '../validators/initiative.validator';

// Community-scoped list + create.
export const communityInitiativesRouter = Router({ mergeParams: true });
communityInitiativesRouter.use('/:cid/initiatives', verifyToken, loadMembership('cid'));
communityInitiativesRouter.get(
  '/:cid/initiatives',
  readLimiter,
  validate(listInitiativesQuerySchema, 'query'),
  initCtl.list,
);
communityInitiativesRouter.post(
  '/:cid/initiatives',
  writeLimiter,
  validate(createInitiativeSchema),
  initCtl.create,
);

// Initiative-scoped routes.
export const initiativesRouter = Router();
initiativesRouter.use(verifyToken);
initiativesRouter.get('/:iid', readLimiter, initCtl.detail);
initiativesRouter.patch(
  '/:iid',
  writeLimiter,
  validate(updateInitiativeSchema),
  initCtl.update,
);
initiativesRouter.delete('/:iid', writeLimiter, initCtl.remove);
initiativesRouter.post('/:iid/submit', writeLimiter, initCtl.submit);
initiativesRouter.post('/:iid/approve', writeLimiter, initCtl.approve);
initiativesRouter.post(
  '/:iid/reject',
  writeLimiter,
  validate(rejectInitiativeSchema),
  initCtl.reject,
);
initiativesRouter.post('/:iid/support', writeLimiter, initCtl.support);
initiativesRouter.delete('/:iid/support', writeLimiter, initCtl.unsupport);
initiativesRouter.post(
  '/:iid/contributors',
  writeLimiter,
  validate(addContributorSchema),
  initCtl.contributor,
);
initiativesRouter.post(
  '/:iid/complete',
  writeLimiter,
  validate(completeInitiativeSchema),
  initCtl.complete,
);
initiativesRouter.get('/:iid/comments', readLimiter, initCtl.comments);
initiativesRouter.post(
  '/:iid/comments',
  writeLimiter,
  validate(createCommentSchema),
  initCtl.comment,
);
