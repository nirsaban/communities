import type { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { ok, created, noContent } from '../utils/response';
import { auditFromReq } from '../services/audit.service';
import {
  listInitiatives,
  getInitiative,
  createInitiative,
  updateInitiative,
  deleteInitiative,
  submitInitiative,
  approveInitiative,
  rejectInitiative,
  addSupport,
  removeSupport,
  addContributor,
  completeInitiative,
  listComments,
  addComment,
} from '../services/initiative.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || !req.membership) throw AppError.unauthorized();
  const role = req.user.globalRole === 'superadmin' ? 'super' : req.membership.role;
  const { items, nextCursor } = await listInitiatives(req.membership.communityId, {
    limit: req.query.limit as number | undefined,
    cursor: req.query.cursor as string | undefined,
    status: req.query.status as
      | 'draft'
      | 'submitted'
      | 'under_review'
      | 'approved'
      | 'active'
      | 'completed'
      | 'rejected'
      | undefined,
    category: req.query.category as 'event' | 'volunteer' | 'product' | 'social' | 'other' | undefined,
    filter: req.query.filter as 'mine' | 'supporting' | 'all' | undefined,
    viewerId: req.user._id,
    viewerRole: role,
  });
  ok(res, items, { nextCursor });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || !req.membership) throw AppError.unauthorized();
  const initiative = await createInitiative(
    { _id: req.membership.communityId },
    req.user,
    req.body,
  );
  await auditFromReq(req, {
    action: 'initiative.create',
    communityId: req.membership.communityId,
    targetType: 'initiative',
    targetId: initiative._id,
  });
  created(res, initiative.toClientJSON(String(req.user._id)));
});

export const detail = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  const i = await getInitiative(req.params.iid, req.user);
  ok(res, i.toClientJSON(String(req.user._id)));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  const i = await updateInitiative(req.params.iid, req.user, req.body);
  await auditFromReq(req, {
    action: 'initiative.update',
    communityId: i.communityId,
    targetType: 'initiative',
    targetId: i._id,
    metadata: { fields: Object.keys(req.body) },
  });
  ok(res, i.toClientJSON(String(req.user._id)));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  await deleteInitiative(req.params.iid, req.user);
  await auditFromReq(req, {
    action: 'initiative.delete',
    targetType: 'initiative',
    targetId: req.params.iid,
  });
  noContent(res);
});

export const submit = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  const i = await submitInitiative(req.params.iid, req.user);
  await auditFromReq(req, {
    action: 'initiative.submit',
    communityId: i.communityId,
    targetType: 'initiative',
    targetId: i._id,
  });
  ok(res, i.toClientJSON(String(req.user._id)));
});

export const approve = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  const i = await approveInitiative(req.params.iid, req.user);
  await auditFromReq(req, {
    action: 'initiative.approve',
    communityId: i.communityId,
    targetType: 'initiative',
    targetId: i._id,
  });
  ok(res, i.toClientJSON(String(req.user._id)));
});

export const reject = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  const i = await rejectInitiative(req.params.iid, req.user, req.body?.reason);
  await auditFromReq(req, {
    action: 'initiative.reject',
    communityId: i.communityId,
    targetType: 'initiative',
    targetId: i._id,
    metadata: { reason: req.body?.reason },
  });
  ok(res, i.toClientJSON(String(req.user._id)));
});

export const support = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  const i = await addSupport(req.params.iid, req.user);
  ok(res, i.toClientJSON(String(req.user._id)));
});

export const unsupport = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  const i = await removeSupport(req.params.iid, req.user);
  ok(res, i.toClientJSON(String(req.user._id)));
});

export const contributor = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  const i = await addContributor(req.params.iid, req.user, req.body.userId);
  await auditFromReq(req, {
    action: 'initiative.addContributor',
    communityId: i.communityId,
    targetType: 'initiative',
    targetId: i._id,
    metadata: { userId: req.body.userId },
  });
  ok(res, i.toClientJSON(String(req.user._id)));
});

export const complete = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  const i = await completeInitiative(req.params.iid, req.user, req.body?.summary);
  await auditFromReq(req, {
    action: 'initiative.complete',
    communityId: i.communityId,
    targetType: 'initiative',
    targetId: i._id,
  });
  ok(res, i.toClientJSON(String(req.user._id)));
});

export const comments = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  const list = await listComments(req.params.iid, req.user);
  ok(res, list.map((c) => c.toClientJSON()));
});

export const comment = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  const c = await addComment(req.params.iid, req.user, req.body);
  created(res, c.toClientJSON());
});
