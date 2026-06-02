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

export const authLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_AUTH_WINDOW_MS,
  limit: env.RATE_LIMIT_AUTH_MAX,
  ...standardOptions,
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
