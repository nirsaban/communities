import type { Request, Response, NextFunction, RequestHandler } from 'express';
import mongoose from 'mongoose';
import { Membership, CommunityRole } from '../models/Membership';
import { Community } from '../models/Community';
import { AppError } from '../utils/AppError';
import type { GlobalRole } from '../models/User';

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
      // Suspended communities: only super admins can interact.
      if (community.status !== 'active' && req.user.globalRole !== 'superadmin') {
        throw AppError.unauthorized('Community is not active');
      }

      if (req.user.globalRole === 'superadmin') {
        // Synthesize an admin-like membership so downstream checks succeed.
        const synthetic = new Membership({
          userId: req.user._id,
          communityId: community._id,
          role: 'admin',
          status: 'active',
        });
        req.membership = synthetic;
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
      next();
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
