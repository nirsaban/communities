import type { Request, Response } from 'express';
import { AppError } from '../utils/AppError';
import { ok, created, noContent } from '../utils/response';
import asyncHandler from '../utils/asyncHandler';
import {
  getCommunity,
  updateCommunity,
  submitOnboarding,
  listMembers,
  inviteMember,
  changeMemberRole,
  removeMember,
  acceptInvitation,
} from '../services/community.service';
import { auditFromReq } from '../services/audit.service';

export const detail = asyncHandler(async (req: Request, res: Response) => {
  if (!req.membership) throw AppError.unauthorized();
  // Community already loaded indirectly; refetch through req.membership for consistency.
  const Community = (await import('../models/Community')).Community;
  const community = await Community.findById(req.membership.communityId);
  if (!community) throw AppError.notFound();
  ok(res, await getCommunity(community));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  if (!req.membership) throw AppError.unauthorized();
  const Community = (await import('../models/Community')).Community;
  const community = await Community.findById(req.membership.communityId);
  if (!community) throw AppError.notFound();
  const updated = await updateCommunity(community, req.body);
  await auditFromReq(req, {
    action: 'community.update',
    communityId: community._id,
    targetType: 'community',
    targetId: community._id,
    metadata: { fields: Object.keys(req.body) },
  });
  ok(res, updated.toClientJSON());
});

export const onboard = asyncHandler(async (req: Request, res: Response) => {
  if (!req.membership) throw AppError.unauthorized();
  const Community = (await import('../models/Community')).Community;
  const community = await Community.findById(req.membership.communityId);
  if (!community) throw AppError.notFound();
  const updated = await submitOnboarding(community, req.body);
  await auditFromReq(req, {
    action: 'community.onboard',
    communityId: community._id,
    targetType: 'community',
    targetId: community._id,
    metadata: { step: req.body.completedStep },
  });
  ok(res, updated.toClientJSON());
});

export const members = asyncHandler(async (req: Request, res: Response) => {
  if (!req.membership) throw AppError.unauthorized();
  const Community = (await import('../models/Community')).Community;
  const community = await Community.findById(req.membership.communityId);
  if (!community) throw AppError.notFound();
  const { items, nextCursor } = await listMembers(community, {
    limit: req.query.limit as number | undefined,
    cursor: req.query.cursor as string | undefined,
    role: req.query.role as 'member' | 'event_manager' | 'subadmin' | 'admin' | undefined,
  });
  ok(res, items, { nextCursor });
});

export const invite = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || !req.membership) throw AppError.unauthorized();
  const Community = (await import('../models/Community')).Community;
  const community = await Community.findById(req.membership.communityId);
  if (!community) throw AppError.notFound();
  // Sub Admins cannot invite at admin or subadmin level.
  if (
    req.user.globalRole !== 'superadmin' &&
    req.membership.role === 'subadmin' &&
    (req.body.role === 'admin' || req.body.role === 'subadmin')
  ) {
    throw AppError.unauthorized('Sub Admins cannot invite admins or subadmins');
  }
  const invitation = await inviteMember(community, req.user, req.body);
  await auditFromReq(req, {
    action: 'member.invite',
    communityId: community._id,
    targetType: 'invitation',
    targetId: invitation._id,
    metadata: { email: invitation.email, role: invitation.role },
  });
  created(res, {
    id: String(invitation._id),
    email: invitation.email,
    role: invitation.role,
    expiresAt: invitation.expiresAt,
    token: invitation.token,
  });
});

export const changeRole = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || !req.membership) throw AppError.unauthorized();
  const Community = (await import('../models/Community')).Community;
  const community = await Community.findById(req.membership.communityId);
  if (!community) throw AppError.notFound();
  const updated = await changeMemberRole(community, req.params.uid, req.body, req.user);
  await auditFromReq(req, {
    action: 'member.roleChange',
    communityId: community._id,
    targetType: 'membership',
    targetId: updated._id,
    metadata: { newRole: updated.role, userId: req.params.uid },
  });
  ok(res, updated.toClientJSON());
});

export const removeOne = asyncHandler(async (req: Request, res: Response) => {
  if (!req.membership) throw AppError.unauthorized();
  const Community = (await import('../models/Community')).Community;
  const community = await Community.findById(req.membership.communityId);
  if (!community) throw AppError.notFound();
  await removeMember(community, req.params.uid);
  await auditFromReq(req, {
    action: 'member.remove',
    communityId: community._id,
    targetType: 'user',
    targetId: req.params.uid,
  });
  noContent(res);
});

export const acknowledgeRules = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || !req.membership) throw AppError.unauthorized();
  // req.membership is a Membership document loaded by middleware.
  const m = req.membership;
  m.onboarding = {
    ...(m.onboarding || {}),
    rulesAcceptedAt: new Date(),
  };
  await m.save();
  ok(res, m.toClientJSON());
});

export const acceptInvite = asyncHandler(async (req: Request, res: Response) => {
  const result = await acceptInvitation(req.params.token, req.user || null, req.body);
  await auditFromReq(req, {
    action: 'invitation.accept',
    communityId: result.membership.communityId,
    targetType: 'membership',
    targetId: result.membership._id,
    metadata: { createdAccount: result.createdAccount },
  });
  ok(res, {
    membership: result.membership.toClientJSON(),
    user: result.user.toSafeJSON(),
    createdAccount: result.createdAccount,
  });
});
