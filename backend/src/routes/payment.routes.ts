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
import { readLimiter, writeLimiter } from '../middleware/rateLimiter';
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

// Dev-only stub Stripe surfaces. Guarded inside the controller — return 404 in prod.
import * as paymentDevCtl from '../controllers/payment-dev.controller';
paymentRouter.get('/_dev/checkout', paymentDevCtl.checkoutPage);
paymentRouter.post('/_dev/settle', paymentDevCtl.settle);
paymentRouter.get('/_dev/done', paymentDevCtl.done);

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

// Stripe webhook — raw body, no JWT, signature verified instead.
export const webhookRouter = Router();
webhookRouter.post(
  '/stripe',
  express.raw({ type: 'application/json', limit: '1mb' }),
  webhookCtl.stripeWebhook,
);
