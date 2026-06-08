import { Router } from 'express';
import * as communityCtl from '../controllers/community.controller';
import { validate } from '../middleware/validate';
import { readLimiter, writeLimiter } from '../middleware/rateLimiter';
import { acceptInvitationSchema } from '../validators/community.validator';
import { verifyToken } from '../middleware/auth';

const router = Router();

// Peek at an invitation (public — used by the web /invite/:token page to render
// community/role before the user accepts). Does not consume the invite.
router.get('/:token', readLimiter, communityCtl.peekInvite);

// Invitations can be accepted by an anonymous (inline-signup) or logged-in user.
// We attempt to load the user if a token is present, but allow anonymous through.
router.post(
  '/:token/accept',
  writeLimiter,
  (req, _res, next) => {
    const hasAuth = (req.get('authorization') || '').toLowerCase().startsWith('bearer ');
    if (hasAuth) {
      verifyToken(req, _res, next);
      return;
    }
    next();
  },
  validate(acceptInvitationSchema),
  communityCtl.acceptInvite,
);

export default router;
