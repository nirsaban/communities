import type { Request, Response, NextFunction, RequestHandler } from 'express';
import mongoose from 'mongoose';
import { EventModel, IEvent } from '../models/Event';
import { Community } from '../models/Community';
import { Membership } from '../models/Membership';
import { AppError } from '../utils/AppError';

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Loads the event referenced by req.params.eid, attaches it to req.event,
// verifies the user has community-level access, and attaches req.membership.
export function loadEventScope(): RequestHandler {
  return async (req, _res, next) => {
    try {
      if (!req.user) throw AppError.unauthenticated();
      const { eid } = req.params;
      if (!eid || !mongoose.Types.ObjectId.isValid(eid)) {
        throw AppError.notFound('Event not found');
      }
      const event = await EventModel.findById(eid);
      if (!event) throw AppError.notFound('Event not found');
      (req as unknown as { event: IEvent }).event = event;

      // Block mutations against events in suspended/deleted communities.
      // Reads still flow through so the frontend can render an "unavailable"
      // banner consistent with SuspendedCommunityScreen.
      if (!READ_METHODS.has(req.method) && req.user.globalRole !== 'superadmin') {
        const community = await Community.findById(event.communityId).select({ status: 1, deletedAt: 1 }).lean();
        if (!community || community.deletedAt) throw AppError.notFound('Event not found');
        if (community.status !== 'active') {
          throw AppError.unauthorized('Community is not active');
        }
      }

      if (req.user.globalRole === 'superadmin') {
        // Prefer real membership if super is also a member of the event's
        // community (matches loadMembership in middleware/role.ts).
        const real = await Membership.findOne({
          userId: req.user._id,
          communityId: event.communityId,
          status: 'active',
        });
        if (real) {
          req.membership = real;
        } else {
          const synthetic = new Membership({
            userId: req.user._id,
            communityId: event.communityId,
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
        communityId: event.communityId,
        status: 'active',
      });
      if (!membership) throw AppError.notFound('Event not found');
      req.membership = membership;
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function requireEventManager(): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const event = (req as unknown as { event?: IEvent }).event;
    if (!event) {
      next(AppError.internal('Event not loaded'));
      return;
    }
    if (req.user?.globalRole === 'superadmin') {
      // Read-only bypass; mutations must come via /super/* or via a real
      // community membership (synthetic memberships flagged by isNew).
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        next();
        return;
      }
      if (req.membership && !req.membership.isNew) {
        const r = req.membership.role;
        if (r === 'admin' || r === 'subadmin') {
          next();
          return;
        }
      }
      next(AppError.unauthorized('Super admins must use /super/* for mutations'));
      return;
    }
    const role = req.membership?.role;
    if (role === 'admin' || role === 'subadmin') {
      next();
      return;
    }
    // Per PRD 06 §4: per-event grant via Event.managers[] alone. Any community
    // member assigned to this event's manager list qualifies, regardless of
    // their Membership.role.
    const isManager = event.managers.some((m) => String(m) === String(req.user!._id));
    if (!isManager) {
      next(AppError.unauthorized('Not assigned to this event'));
      return;
    }
    next();
  };
}

export function getLoadedEvent(req: Request): IEvent {
  const e = (req as unknown as { event?: IEvent }).event;
  if (!e) throw AppError.internal('Event not loaded');
  return e;
}
