import type { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { getStripeService } from '../services/stripe.service';
import { handleWebhookEvent } from '../services/webhook.service';
import logger from '../config/logger';

export const stripeWebhook = asyncHandler(async (req: Request, res: Response) => {
  const signature = req.get('stripe-signature');
  if (!signature) {
    throw AppError.invalidInput('Missing stripe-signature header');
  }
  if (!Buffer.isBuffer(req.body)) {
    // express.raw() must run before the JSON parser for this route.
    throw AppError.internal('Webhook handler must receive a raw body');
  }
  const event = getStripeService().verifyWebhookEvent(req.body, signature);
  const outcome = await handleWebhookEvent(event);
  logger.info({
    msg: 'stripe.webhook.handled',
    id: event.id,
    type: event.type,
    duplicate: outcome.duplicate,
  });
  // Stripe expects 2xx; body is informational.
  res.json({ received: true, ...outcome });
});
