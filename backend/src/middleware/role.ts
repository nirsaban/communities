import type { Request, Response, NextFunction, RequestHandler } from 'express';
import mongoose from 'mongoose';
import { Membership, CommunityRole } from '../models/Membership';
import { Community } from '../models/Community';
import { AppError } from '../utils/AppError';
import type { GlobalRole } from '../models/User';

// Read methods that don't mutate state. Super-admin can observe any community
// through these (for support / investigation), but per PRD 03 §5 must use
// /super/* paths for mutations — the bypass narrows accordingly.
const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(AppError.unauthenticated());
    return;
  }
  next();
}

export function requireGlobalRole(...roles: GlobalRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      next(AppError.unauthenticated());
      return;
    }
    if (!roles.includes(req.user.globalRole)) {
      next(AppError.unauthorized('Insufficient global role'));
      return;
    }
    next();
  };
}

// Reads community ID from `req.params.cid` and loads the membership.
// Super Admins bypass and get a synthetic admin-equivalent context.
export function loadMembership(paramName = 'cid'): RequestHandler {
  return async (req, _res, next) => {
    try {
      if (!req.user) {
        throw AppError.unauthenticated();
      }
      const rawId = req.params[paramName];
      if (!rawId || !mongoose.Types.ObjectId.isValid(rawId)) {
        throw AppError.notFound('Community not found');
      }
      const community = await Community.findById(rawId);
      if (!community || community.deletedAt) {
        throw AppError.notFound('Community not found');
      }
      // Suspended communities: only super admins can mutate. Members may still
      // GET so the SuspendedCommunityScreen can render with `status: 'suspended'`.
      // Soft-deleted (deletedAt) was already rejected above as 404.
      if (
        community.status !== 'active' &&
        req.user.globalRole !== 'superadmin' &&
        !READ_METHODS.has(req.method)
      ) {
        throw AppError.unauthorized('Community is not active');
      }

      if (req.user.globalRole === 'superadmin') {
        // Prefer the real membership if one exists (so an admin-in-Acme super
        // still acts as that admin), otherwise fall back to a synthetic admin
        // for read-only support flows. Mutating endpoints check
        // `req.membership.isNew` to distinguish (see requireCommunityRole).
        const real = await Membership.findOne({
          userId: req.user._id,
          communityId: community._id,
          status: 'active',
        });
        if (real) {
          req.membership = real;
        } else {
          const synthetic = new Membership({
            userId: req.user._id,
            communityId: community._id,
            role: 'admin',
            status: 'active',
          });
          req.membership = synthetic;
        }
        next();
        return;
      }

      const membership = await Membership.findOne({
        userId: req.user._id,
        communityId: community._id,
        status: 'active',
      });
      if (!membership) {
        throw AppError.notFound('Community not found');
      }
      req.membership = membership;
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function requireCommunityRole(...roles: CommunityRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      next(AppError.unauthenticated());
      return;
    }
    if (req.user.globalRole === 'superadmin') {
      // Super-admin bypass is intentionally read-only. Mutations must go
      // through /super/* (PRD 03 §5). Without this guard, the synthetic
      // admin membership produced by loadMembership would silently satisfy
      // role checks for writes against any community.
      if (READ_METHODS.has(req.method)) {
        next();
        return;
      }
      // Allow the bypass only when the super-admin also holds the required
      // community role through a real membership (e.g. demo seed makes Bob
      // an admin in Acme Devs). Otherwise force them to use /super/*.
      if (req.membership && !req.membership.isNew && roles.includes(req.membership.role)) {
        next();
        return;
      }
      next(AppError.unauthorized('Super admins must use /super/* for mutations'));
      return;
    }
    if (!req.membership) {
      next(AppError.unauthorized('Community context required'));
      return;
    }
    if (!roles.includes(req.membership.role)) {
      next(AppError.unauthorized('Insufficient community role'));
      return;
    }
    next();
  };
}

export function blockSubAdminFromFinancial(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (req.user?.globalRole === 'superadmin') {
    next();
    return;
  }
  if (req.membership?.role === 'subadmin') {
    next(AppError.unauthorized('Sub Admins cannot access financial data'));
    return;
  }
  next();
}
