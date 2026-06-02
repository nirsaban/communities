import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import asyncHandler from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import env from '../config/env';
import { settleEventPayment } from '../services/payment.service';
import { Payment } from '../models/Payment';
import { Subscription } from '../models/Subscription';
import { Community } from '../models/Community';

function guardDevOnly(): void {
  if (env.NODE_ENV === 'production') {
    throw AppError.notFound('Not found');
  }
}

// Renders a minimal HTML page that simulates Stripe Checkout. Two buttons:
// "Simulate success" → POSTs settle → redirects to /api/v1/payments/_dev/done?status=success
// "Simulate cancel"  → redirects to /api/v1/payments/_dev/done?status=cancel
// The mobile app polls /me/rsvps (or /me/subscriptions) on resume to detect the outcome.
export const checkoutPage = asyncHandler(async (req: Request, res: Response) => {
  guardDevOnly();
  const sessionId = String(req.query.session ?? '');
  const paymentId = String(req.query.paymentId ?? '');
  const kind = String(req.query.kind ?? 'event');
  const base = env.API_BASE_URL.replace(/\/+$/, '');
  const successPath = `/api/v1/payments/_dev/settle?session=${sessionId}&paymentId=${paymentId}&kind=${kind}&communityId=${req.query.communityId ?? ''}&userId=${req.query.userId ?? ''}&plan=${req.query.plan ?? ''}`;
  const cancelPath = `/api/v1/payments/_dev/done?status=cancel`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Stub Stripe Checkout</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#fafaf7;color:#14130f;padding:32px;margin:0}
  h1{font-size:20px;margin:0 0 8px}
  p{color:#6b6b6b;margin:0 0 24px;line-height:1.5}
  .panel{max-width:420px;background:#fff;border:1px solid #eee;border-radius:12px;padding:24px;margin:0 auto;box-shadow:0 4px 24px rgba(0,0,0,.04)}
  .row{display:flex;gap:8px;margin-top:16px}
  form{flex:1;margin:0}
  button,a.btn{display:block;width:100%;height:48px;border-radius:12px;border:0;font-weight:700;font-size:15px;cursor:pointer;text-decoration:none;text-align:center;line-height:48px}
  .primary{background:#ff5c35;color:#fff}
  .ghost{background:#f4f3ef;color:#14130f}
  .meta{font-size:12px;color:#9a9a9a;margin-top:16px;word-break:break-all}
</style></head><body>
<div class="panel">
  <h1>Stub Stripe Checkout</h1>
  <p>Real Stripe isn't configured. Pick an outcome to simulate. The app will detect it on resume.</p>
  <div class="row">
    <form method="post" action="${base}${successPath}">
      <button class="primary" type="submit">Simulate success</button>
    </form>
  </div>
  <div class="row">
    <a class="btn ghost" href="${base}${cancelPath}">Cancel / fail</a>
  </div>
  <div class="meta">session: ${sessionId}</div>
</div>
</body></html>`);
});

export const settle = asyncHandler(async (req: Request, res: Response) => {
  guardDevOnly();
  const paymentId = String(req.query.paymentId ?? '');
  const kind = String(req.query.kind ?? 'event');
  const sessionId = String(req.query.session ?? '');
  if (kind === 'event') {
    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      throw AppError.invalidInput('paymentId required');
    }
    const payment = await Payment.findById(paymentId);
    if (!payment) throw AppError.notFound('Payment not found');
    await settleEventPayment({
      paymentId: String(payment._id),
      paymentIntentId: payment.stripePaymentIntentId ?? `pi_stub_${sessionId}`,
    });
  } else if (kind === 'subscription') {
    const communityId = String(req.query.communityId ?? '');
    const userId = String(req.query.userId ?? '');
    const plan = String(req.query.plan ?? 'monthly');
    if (!mongoose.Types.ObjectId.isValid(communityId) || !mongoose.Types.ObjectId.isValid(userId)) {
      throw AppError.invalidInput('communityId+userId required');
    }
    const community = await Community.findById(communityId);
    if (!community) throw AppError.notFound('Community not found');
    const now = new Date();
    const periodEnd = new Date(
      now.getTime() + (plan === 'annual' ? 365 : 30) * 24 * 60 * 60 * 1000,
    );
    await Subscription.findOneAndUpdate(
      { communityId, userId, stripeSubscriptionId: `sub_stub_${sessionId}` },
      {
        $setOnInsert: {
          communityId,
          userId,
          stripeSubscriptionId: `sub_stub_${sessionId}`,
          stripeCustomerId: `cus_stub_${userId}`,
          plan,
        },
        $set: {
          status: 'active',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
        },
      },
      { upsert: true, new: true },
    );
    community.metrics.totalRevenueCents += plan === 'annual' ? 120_00 : 12_00;
    await community.save();
  }
  res.redirect(`${env.API_BASE_URL.replace(/\/+$/, '')}/api/v1/payments/_dev/done?status=success`);
});

export const done = asyncHandler(async (req: Request, res: Response) => {
  guardDevOnly();
  const status = String(req.query.status ?? 'success');
  const ok = status === 'success';
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!doctype html>
<html><head><meta charset="utf-8"><title>${ok ? 'Payment received' : 'Payment cancelled'}</title>
<style>body{font-family:-apple-system,sans-serif;background:#fafaf7;color:#14130f;padding:40px;text-align:center}h1{font-size:22px;margin:24px 0 8px}p{color:#6b6b6b}.dot{width:64px;height:64px;border-radius:50%;display:inline-block;background:${ok ? '#dbf1d8' : '#fde2e2'};color:${ok ? '#1f7a1f' : '#c93030'};line-height:64px;font-size:32px;font-weight:700}</style></head>
<body><div class="dot">${ok ? '✓' : '×'}</div>
<h1>${ok ? 'Payment received' : 'Payment cancelled'}</h1>
<p>You can return to the app.</p></body></html>`);
});
