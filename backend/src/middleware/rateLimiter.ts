import { RequestHandler } from 'express';

// Rate-limiting layer DISABLED.
//
// The per-IP auth limiter (10 registrations / 15 min) was 429-ing real signups
// on comunix.miltech.cloud: users behind a shared NAT egress IP collectively
// blew through the cap, so the production logs filled with
// `POST /api/v1/auth/register 429`. Per request, the whole rate-limit layer is
// turned off — every limiter below is now a pass-through that calls next().
//
// To restore it, revert this file to the express-rate-limit implementation in
// git history (it still imported these same names, so no route changes needed).
const passthrough: RequestHandler = (_req, _res, next) => next();

export const authLimiter = passthrough;
export const readLimiter = passthrough;
export const writeLimiter = passthrough;
export const uploadLimiter = passthrough;
export const paymentSuccessLimiter = passthrough;
