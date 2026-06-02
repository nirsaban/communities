import { Router } from 'express';
import * as postCtl from '../controllers/post.controller';
import { verifyToken } from '../middleware/auth';
import { loadMembership } from '../middleware/role';
import { validate } from '../middleware/validate';
import { readLimiter, writeLimiter } from '../middleware/rateLimiter';
import {
  createPostSchema,
  updatePostSchema,
  createPostCommentSchema,
  listPostsQuerySchema,
} from '../validators/post.validator';

// Community-scoped list + create.
export const communityPostsRouter = Router({ mergeParams: true });
communityPostsRouter.use('/:cid/posts', verifyToken, loadMembership('cid'));
communityPostsRouter.get(
  '/:cid/posts',
  readLimiter,
  validate(listPostsQuerySchema, 'query'),
  postCtl.list,
);
communityPostsRouter.post(
  '/:cid/posts',
  writeLimiter,
  validate(createPostSchema),
  postCtl.create,
);

// Post-scoped routes.
export const postsRouter = Router();
postsRouter.use(verifyToken);
postsRouter.get('/:pid', readLimiter, postCtl.detail);
postsRouter.patch('/:pid', writeLimiter, validate(updatePostSchema), postCtl.update);
postsRouter.delete('/:pid', writeLimiter, postCtl.remove);
postsRouter.post('/:pid/pin', writeLimiter, postCtl.pin);
postsRouter.post('/:pid/unpin', writeLimiter, postCtl.unpin);
postsRouter.get('/:pid/comments', readLimiter, postCtl.comments);
postsRouter.post(
  '/:pid/comments',
  writeLimiter,
  validate(createPostCommentSchema),
  postCtl.comment,
);

// Moderation — admin/subadmin of the post's community (checked in handler).
import * as adminCtl from '../controllers/admin.controller';
postsRouter.post('/:pid/moderate', writeLimiter, adminCtl.moderatePost);
