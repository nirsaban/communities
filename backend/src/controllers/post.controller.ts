import type { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { ok, created, noContent } from '../utils/response';
import { auditFromReq } from '../services/audit.service';
import {
  listPosts,
  createPost,
  getPost,
  updatePost,
  pinPost,
  deletePost,
  listPostComments,
  addPostComment,
} from '../services/post.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || !req.membership) throw AppError.unauthorized();
  const { items, nextCursor } = await listPosts(req.membership.communityId, {
    limit: req.query.limit as number | undefined,
    cursor: req.query.cursor as string | undefined,
    type: req.query.type as 'announcement' | 'discussion' | 'update' | undefined,
  });
  ok(res, items, { nextCursor });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || !req.membership) throw AppError.unauthorized();
  const post = await createPost({ _id: req.membership.communityId }, req.user, req.body);
  await auditFromReq(req, {
    action: 'post.create',
    communityId: post.communityId,
    targetType: 'post',
    targetId: post._id,
    metadata: { type: post.type },
  });
  created(res, post.toClientJSON());
});

export const detail = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  const post = await getPost(req.params.pid, req.user);
  ok(res, post.toClientJSON());
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  const post = await updatePost(req.params.pid, req.user, req.body);
  await auditFromReq(req, {
    action: 'post.update',
    communityId: post.communityId,
    targetType: 'post',
    targetId: post._id,
    metadata: { fields: Object.keys(req.body) },
  });
  ok(res, post.toClientJSON());
});

export const pin = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  const post = await pinPost(req.params.pid, req.user, true);
  await auditFromReq(req, {
    action: 'post.pin',
    communityId: post.communityId,
    targetType: 'post',
    targetId: post._id,
  });
  ok(res, post.toClientJSON());
});

export const unpin = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  const post = await pinPost(req.params.pid, req.user, false);
  await auditFromReq(req, {
    action: 'post.unpin',
    communityId: post.communityId,
    targetType: 'post',
    targetId: post._id,
  });
  ok(res, post.toClientJSON());
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  await deletePost(req.params.pid, req.user);
  await auditFromReq(req, {
    action: 'post.delete',
    targetType: 'post',
    targetId: req.params.pid,
  });
  noContent(res);
});

export const comments = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  const list = await listPostComments(req.params.pid, req.user);
  ok(res, list.map((c) => c.toClientJSON()));
});

export const comment = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  const c = await addPostComment(req.params.pid, req.user, req.body);
  created(res, c.toClientJSON());
});
