import rateLimit, { Options } from 'express-rate-limit';
import env from '../config/env';

const standardOptions: Partial<Options> = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res, _next, options) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests, please try again later',
        details: { retryAfterMs: options.windowMs },
      },
    });
  },
  skip: () => env.isTest,
};

// Loopback requests from the local dev box (the role-walk demo logs in as 5
// roles back-to-back, plus repeated agent/curl probes) would otherwise blow
// through the 10-per-15-min auth cap and self-lock for 15 minutes. Skip the
// auth limiter for loopback IPs in development only — production keeps the full
// per-IP limit.
const isLoopback = (ip?: string): boolean =>
  ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';

export const authLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_AUTH_WINDOW_MS,
  limit: env.RATE_LIMIT_AUTH_MAX,
  ...standardOptions,
  skip: (req) => env.isTest || (env.isDev && isLoopback(req.ip)),
});

export const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: env.RATE_LIMIT_READ_MAX,
  ...standardOptions,
});

export const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: env.RATE_LIMIT_WRITE_MAX,
  ...standardOptions,
});

export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  ...standardOptions,
});

// /api/v1/payments/success?ref=… is polled by the mobile checkout screen every
// 2s for up to 60s after the user returns from the PayPlus hosted page. Cap at
// 10 requests / minute / IP to keep that loop honest without breaking the UX.
export const paymentSuccessLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  ...standardOptions,
});
