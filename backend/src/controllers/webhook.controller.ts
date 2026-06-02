import type { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import logger from '../config/logger';
import { applyWebhook, verifyWebhook } from '../services/payment/GatewayService';

/**
 * PayPlus webhook receiver. Mounted with raw-body middleware
 * (`express.raw({ type: '*\/*' })`) in `routes/payment.routes.ts`, BEFORE the
 * global JSON parser, so HMAC signature verification operates on the exact
 * bytes PayPlus signed.
 *
 * Idempotency: each handler short-circuits when the target row is already in
 * its terminal state (see `applyWebhook`).
 */
export const payplusWebhook = asyncHandler(async (req: Request, res: Response) => {
  const signature =
    req.get('x-payplus-signature') ?? req.get('payplus-signature') ?? '';
  if (!Buffer.isBuffer(req.body)) {
    // express.raw() must run before the JSON parser for this route.
    throw AppError.internal('PayPlus webhook handler must receive a raw body');
  }

  // Truncated body logging (2KB cap) so we have something to grep when a webhook
  // misbehaves, without dumping card metadata into Winston.
  const truncated = req.body.toString('utf8').slice(0, 2048);
  logger.info({
    msg: 'payplus.webhook.received',
    bytes: req.body.length,
    signaturePresent: signature.length > 0,
    bodyPreview: truncated,
  });

  const event = verifyWebhook(req.body, signature);

  const outcome = await applyWebhook(event);
  logger.info({
    msg: 'payplus.webhook.handled',
    id: event.id,
    type: event.type,
    handled: outcome.handled,
    duplicate: outcome.duplicate,
  });
  res.json({ received: true, ...outcome });
});
