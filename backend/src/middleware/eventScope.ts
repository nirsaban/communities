import type { Request, Response, NextFunction, RequestHandler } from 'express';
import mongoose from 'mongoose';
import { EventModel, IEvent } from '../models/Event';
import { Membership } from '../models/Membership';
import { AppError } from '../utils/AppError';

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

      if (req.user.globalRole === 'superadmin') {
        const synthetic = new Membership({
          userId: req.user._id,
          communityId: event.communityId,
          role: 'admin',
          status: 'active',
        });
        req.membership = synthetic;
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
      next();
      return;
    }
    const role = req.membership?.role;
    if (role === 'admin' || role === 'subadmin') {
      next();
      return;
    }
    const isManager =
      role === 'event_manager' && event.managers.some((m) => String(m) === String(req.user!._id));
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
