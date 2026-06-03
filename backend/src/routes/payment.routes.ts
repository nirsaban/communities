import { Router } from 'express';
import express from 'express';
import * as paymentCtl from '../controllers/payment.controller';
import * as webhookCtl from '../controllers/webhook.controller';
import { verifyToken } from '../middleware/auth';
import {
  loadMembership,
  requireCommunityRole,
  blockSubAdminFromFinancial,
} from '../middleware/role';
import { loadEventScope } from '../middleware/eventScope';
import { validate } from '../middleware/validate';
import { readLimiter, writeLimiter, paymentSuccessLimiter } from '../middleware/rateLimiter';
import {
  subscribeSchema,
  refundSchema,
  listPaymentsQuerySchema,
} from '../validators/payment.validator';

// /api/v1/events/:eid/checkout — any active member can pay (sub-admins included
// in their capacity as members), so no blockSubAdminFromFinancial here.
export const eventCheckoutRouter = Router();
eventCheckoutRouter.post(
  '/:eid/checkout',
  verifyToken,
  loadEventScope(),
  writeLimiter,
  paymentCtl.checkout,
);
eventCheckoutRouter.get(
  '/:eid/payments',
  verifyToken,
  loadEventScope(),
  requireCommunityRole('admin'),
  blockSubAdminFromFinancial,
  readLimiter,
  validate(listPaymentsQuerySchema, 'query'),
  paymentCtl.eventPayments,
);

// /api/v1/communities/:cid/subscribe — any member can subscribe.
// /api/v1/communities/:cid/finances — admin only, no sub-admins.
export const communityPaymentRouter = Router({ mergeParams: true });
communityPaymentRouter.use('/:cid', verifyToken, loadMembership('cid'));
communityPaymentRouter.post(
  '/:cid/subscribe',
  writeLimiter,
  validate(subscribeSchema),
  paymentCtl.subscribe,
);
communityPaymentRouter.get(
  '/:cid/finances',
  requireCommunityRole('admin'),
  blockSubAdminFromFinancial,
  readLimiter,
  paymentCtl.finances,
);

// /api/v1/me/subscriptions — user's own subs.
export const meSubscriptionsRouter = Router();
meSubscriptionsRouter.use(verifyToken);
meSubscriptionsRouter.get('/subscriptions', readLimiter, paymentCtl.mySubscriptions);
meSubscriptionsRouter.post(
  '/subscriptions/:sid/cancel',
  writeLimiter,
  paymentCtl.cancelSubscription,
);

// /api/v1/payments/:pid/refund — admin (in a community context) only.
// Authorization is handled inside the controller via Payment.communityId lookup.
export const paymentRouter = Router();
paymentRouter.post(
  '/:pid/refund',
  verifyToken,
  writeLimiter,
  blockSubAdminFromFinancial,
  validate(refundSchema),
  refundGuard,
  paymentCtl.refund,
);

// Public landing pages after the user comes back from the PayPlus hosted page.
// No JWT (the user may be unauthenticated in a webview); the mobile app polls
// /success?ref=<paymentId> to flip its UI. /success is heavily rate-limited
// (10/min/IP) to keep the poll loop honest; /failure is unconstrained because
// it serves a static OK response.
paymentRouter.get('/success', paymentSuccessLimiter, paymentCtl.paymentSuccessLanding);
paymentRouter.get('/failure', paymentCtl.paymentFailureLanding);

// Verify the caller is an admin of the community that owns the payment.
async function refundGuard(req: import('express').Request, _res: import('express').Response, next: import('express').NextFunction): Promise<void> {
  try {
    if (!req.user) throw new (await import('../utils/AppError')).AppError('UNAUTHENTICATED', 'Authentication required');
    if (req.user.globalRole === 'superadmin') {
      next();
      return;
    }
    const { Payment } = await import('../models/Payment');
    const { Membership } = await import('../models/Membership');
    const payment = await Payment.findById(req.params.pid).select({ communityId: 1 }).lean();
    if (!payment) {
      const { AppError } = await import('../utils/AppError');
      throw AppError.notFound('Payment not found');
    }
    const membership = await Membership.findOne({
      userId: req.user._id,
      communityId: payment.communityId,
      status: 'active',
    });
    const { AppError } = await import('../utils/AppError');
    if (!membership) throw AppError.notFound('Payment not found');
    if (membership.role !== 'admin') {
      throw AppError.unauthorized('Admin role required to issue refunds');
    }
    next();
  } catch (err) {
    next(err);
  }
}

// PayPlus webhook — RAW body (so HMAC verification operates on signed bytes),
// no JWT, signature verified inside the controller.
export const webhookRouter = Router();
webhookRouter.post(
  '/payplus',
  express.raw({ type: '*/*', limit: '1mb' }),
  webhookCtl.payplusWebhook,
);
