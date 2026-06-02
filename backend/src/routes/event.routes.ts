import { Router } from 'express';
import * as eventCtl from '../controllers/event.controller';
import * as qaCtl from '../controllers/event-qa.controller';
import { verifyToken } from '../middleware/auth';
import { loadMembership, requireCommunityRole } from '../middleware/role';
import { loadEventScope, requireEventManager } from '../middleware/eventScope';
import { validate } from '../middleware/validate';
import { readLimiter, writeLimiter, uploadLimiter } from '../middleware/rateLimiter';
import {
  createEventSchema,
  updateEventSchema,
  cancelEventSchema,
  listEventsSchema,
  rsvpSchema,
  assignManagerSchema,
} from '../validators/event.validator';

// Community-scoped routes (list / create under /communities/:cid/events).
export const communityEventsRouter = Router({ mergeParams: true });

communityEventsRouter.use(
  '/:cid/events',
  verifyToken,
  loadMembership('cid'),
);

communityEventsRouter.get(
  '/:cid/events',
  readLimiter,
  validate(listEventsSchema, 'query'),
  eventCtl.list,
);

communityEventsRouter.post(
  '/:cid/events',
  writeLimiter,
  requireCommunityRole('admin', 'subadmin'),
  validate(createEventSchema),
  eventCtl.create,
);

// Event-scoped routes under /events/:eid.
export const eventsRouter = Router();

eventsRouter.use('/:eid', verifyToken, loadEventScope());

eventsRouter.get('/:eid', readLimiter, eventCtl.detail);

eventsRouter.patch(
  '/:eid',
  writeLimiter,
  requireCommunityRole('admin', 'subadmin'),
  validate(updateEventSchema),
  eventCtl.update,
);

eventsRouter.post(
  '/:eid/cancel',
  writeLimiter,
  requireCommunityRole('admin', 'subadmin'),
  validate(cancelEventSchema),
  eventCtl.cancel,
);

eventsRouter.post(
  '/:eid/duplicate',
  writeLimiter,
  requireCommunityRole('admin', 'subadmin'),
  eventCtl.duplicate,
);

eventsRouter.post('/:eid/rsvp', writeLimiter, validate(rsvpSchema), eventCtl.doRsvp);
eventsRouter.delete('/:eid/rsvp', writeLimiter, eventCtl.cancelRsvpHandler);

eventsRouter.get(
  '/:eid/rsvps',
  readLimiter,
  requireEventManager(),
  eventCtl.rsvps,
);

eventsRouter.post(
  '/:eid/managers',
  writeLimiter,
  requireCommunityRole('admin', 'subadmin'),
  validate(assignManagerSchema),
  eventCtl.addManager,
);

eventsRouter.delete(
  '/:eid/managers/:uid',
  writeLimiter,
  requireCommunityRole('admin', 'subadmin'),
  eventCtl.removeManagerHandler,
);

eventsRouter.get('/:eid/materials', readLimiter, eventCtl.materials);

eventsRouter.post(
  '/:eid/materials',
  uploadLimiter,
  requireEventManager(),
  eventCtl.upload.single('file'),
  eventCtl.createMaterial,
);

// Check-in (event manager / admin)
eventsRouter.post(
  '/:eid/rsvps/:rid/check-in',
  writeLimiter,
  requireEventManager(),
  eventCtl.checkInRsvp,
);
eventsRouter.post(
  '/:eid/check-in-all',
  writeLimiter,
  requireEventManager(),
  eventCtl.checkInAll,
);

// Recap publish (event manager / admin)
eventsRouter.post(
  '/:eid/recap',
  writeLimiter,
  requireEventManager(),
  eventCtl.publishRecap,
);

// Broadcast — manager / admin (checked in handler).
import * as adminCtl from '../controllers/admin.controller';
eventsRouter.post('/:eid/broadcast', writeLimiter, adminCtl.broadcastEvent);

// Q&A — list/create are members; manager-only for answer/pin/resolve.
eventsRouter.get('/:eid/qa', readLimiter, qaCtl.list);
eventsRouter.post('/:eid/qa', writeLimiter, qaCtl.create);
eventsRouter.post('/:eid/qa/:qid/upvote', writeLimiter, qaCtl.upvote);
eventsRouter.post('/:eid/qa/:qid/answer', writeLimiter, requireEventManager(), qaCtl.answer);
eventsRouter.post('/:eid/qa/:qid/pin', writeLimiter, requireEventManager(), qaCtl.pin);
eventsRouter.post('/:eid/qa/:qid/resolve', writeLimiter, requireEventManager(), qaCtl.resolve);
