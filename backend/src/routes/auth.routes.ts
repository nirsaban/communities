import { Router } from 'express';
import multer from 'multer';
import * as authCtl from '../controllers/auth.controller';
import { verifyToken } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { authLimiter, writeLimiter } from '../middleware/rateLimiter';
import env from '../config/env';
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

// In-memory upload — buffer is handed to the StorageService put() which
// pipes it to Cloudinary or writes it to disk depending on STORAGE_DRIVER.
// Cap at 8 MB for avatars (independent of MAX_UPLOAD_BYTES used elsewhere).
const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Math.min(env.MAX_UPLOAD_BYTES, 8 * 1024 * 1024) },
  fileFilter(_req, file, cb) {
    if (!/^image\//.test(file.mimetype)) {
      cb(new Error('Only image uploads are allowed'));
      return;
    }
    cb(null, true);
  },
});

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), authCtl.register);
router.post('/login', authLimiter, validate(loginSchema), authCtl.login);
router.post('/refresh', validate(refreshSchema), authCtl.refresh);
router.post('/logout', validate(logoutSchema), authCtl.logoutHandler);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), authCtl.forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), authCtl.resetPassword);
router.post('/verify', authLimiter, validate(verifyEmailSchema), authCtl.verifyEmailHandler);
router.post('/verify/resend', authLimiter, validate(resendVerificationSchema), authCtl.resendVerificationHandler);

// Google OAuth (§1.3). Two-step flow:
//   1. GET /auth/google           → returns { url, state }; client redirects.
//   2. POST /auth/google/callback → exchanges Google's auth code for a session.
router.get('/google', authLimiter, authCtl.googleStart);
router.post('/google/callback', authLimiter, authCtl.googleCallback);

router.get('/me', verifyToken, authCtl.me);
router.patch('/me', verifyToken, validate(updateMeSchema), authCtl.patchMe);
router.delete('/me', verifyToken, authCtl.deleteMeHandler);
router.post(
  '/me/photo',
  verifyToken,
  writeLimiter,
  photoUpload.single('file'),
  authCtl.uploadMyPhoto,
);

export default router;
