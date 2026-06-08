import { Router } from 'express';
import * as authCtl from '../controllers/auth.controller';
import { verifyToken } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { authLimiter } from '../middleware/rateLimiter';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateMeSchema,
  verifyEmailSchema,
  resendVerificationSchema,
} from '../validators/auth.validator';

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), authCtl.register);
router.post('/login', authLimiter, validate(loginSchema), authCtl.login);
router.post('/refresh', validate(refreshSchema), authCtl.refresh);
router.post('/logout', validate(logoutSchema), authCtl.logoutHandler);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), authCtl.forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), authCtl.resetPassword);
router.post('/verify', authLimiter, validate(verifyEmailSchema), authCtl.verifyEmailHandler);
router.post('/verify/resend', authLimiter, validate(resendVerificationSchema), authCtl.resendVerificationHandler);

router.get('/me', verifyToken, authCtl.me);
router.patch('/me', verifyToken, validate(updateMeSchema), authCtl.patchMe);
router.delete('/me', verifyToken, authCtl.deleteMeHandler);

export default router;
