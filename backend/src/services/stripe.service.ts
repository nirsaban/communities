import Stripe from 'stripe';
import env from '../config/env';
import { AppError } from '../utils/AppError';

// Narrow interface around the Stripe SDK calls we actually use.
// Tests substitute an in-memory fake; production wires real Stripe.
export interface StripeService {
  createEventCheckoutSession(input: CreateEventCheckoutInput): Promise<StripeCheckoutResult>;
  createSubscriptionCheckoutSession(
    input: CreateSubscriptionCheckoutInput,
  ): Promise<StripeCheckoutResult>;
  cancelSubscription(stripeSubscriptionId: string): Promise<{
    status: string;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd?: Date;
  }>;
  refundPaymentIntent(input: RefundInput): Promise<{
    refundId: string;
    amountCents: number;
    status: string;
  }>;
  verifyWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event;
}

export interface CreateEventCheckoutInput {
  amountCents: number;
  currency: string;
  eventTitle: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
  // For Stripe Connect: charge on behalf of community's connected account.
  stripeAccountId?: string;
  applicationFeeBps?: number;
}

export interface CreateSubscriptionCheckoutInput {
  priceId: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
  stripeAccountId?: string;
}

export interface RefundInput {
  paymentIntentId: string;
  amountCents?: number; // omit for full refund
  stripeAccountId?: string;
  reason?: 'requested_by_customer' | 'duplicate' | 'fraudulent';
}

export interface StripeCheckoutResult {
  sessionId: string;
  url: string;
  paymentIntentId?: string | null;
}

class RealStripeService implements StripeService {
  private readonly client: Stripe;

  constructor(secretKey: string) {
    this.client = new Stripe(secretKey, {
      apiVersion: env.STRIPE_API_VERSION as Stripe.LatestApiVersion,
      typescript: true,
    });
  }

  async createEventCheckoutSession(input: CreateEventCheckoutInput): Promise<StripeCheckoutResult> {
    const params: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: input.currency.toLowerCase(),
            unit_amount: input.amountCents,
            product_data: { name: input.eventTitle },
          },
        },
      ],
      customer_email: input.customerEmail,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      metadata: input.metadata,
      payment_intent_data: {
        metadata: input.metadata,
      },
    };

    if (input.stripeAccountId && input.applicationFeeBps && input.applicationFeeBps > 0) {
      const feeCents = Math.floor((input.amountCents * input.applicationFeeBps) / 10_000);
      (params.payment_intent_data as Stripe.Checkout.SessionCreateParams.PaymentIntentData) = {
        ...(params.payment_intent_data ?? {}),
        application_fee_amount: feeCents,
      };
    }

    const session = input.stripeAccountId
      ? await this.client.checkout.sessions.create(params, { stripeAccount: input.stripeAccountId })
      : await this.client.checkout.sessions.create(params);

    if (!session.url) {
      throw AppError.internal('Stripe did not return a checkout URL');
    }
    return {
      sessionId: session.id,
      url: session.url,
      paymentIntentId:
        typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id,
    };
  }

  async createSubscriptionCheckoutSession(
    input: CreateSubscriptionCheckoutInput,
  ): Promise<StripeCheckoutResult> {
    const params: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: input.priceId, quantity: 1 }],
      customer_email: input.customerEmail,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      metadata: input.metadata,
      subscription_data: {
        metadata: input.metadata,
      },
    };
    const session = input.stripeAccountId
      ? await this.client.checkout.sessions.create(params, { stripeAccount: input.stripeAccountId })
      : await this.client.checkout.sessions.create(params);
    if (!session.url) throw AppError.internal('Stripe did not return a checkout URL');
    return { sessionId: session.id, url: session.url };
  }

  async cancelSubscription(stripeSubscriptionId: string): Promise<{
    status: string;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd?: Date;
  }> {
    const updated = await this.client.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
    return {
      status: updated.status,
      cancelAtPeriodEnd: updated.cancel_at_period_end,
      currentPeriodEnd: updated.current_period_end
        ? new Date(updated.current_period_end * 1000)
        : undefined,
    };
  }

  async refundPaymentIntent(input: RefundInput): Promise<{
    refundId: string;
    amountCents: number;
    status: string;
  }> {
    const params: Stripe.RefundCreateParams = {
      payment_intent: input.paymentIntentId,
      reason: input.reason ?? 'requested_by_customer',
    };
    if (typeof input.amountCents === 'number') {
      params.amount = input.amountCents;
    }
    const refund = input.stripeAccountId
      ? await this.client.refunds.create(params, { stripeAccount: input.stripeAccountId })
      : await this.client.refunds.create(params);
    return {
      refundId: refund.id,
      amountCents: refund.amount,
      status: refund.status ?? 'unknown',
    };
  }

  verifyWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
    if (!env.STRIPE_WEBHOOK_SECRET) {
      throw AppError.internal('STRIPE_WEBHOOK_SECRET is not configured');
    }
    try {
      return this.client.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      throw AppError.invalidInput(
        `Stripe webhook signature verification failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}

/**
 * Stub used when STRIPE_SECRET_KEY is missing in non-production mode. Returns
 * deterministic session URLs that point at the dev settlement endpoint so the
 * happy path can be demoed end-to-end without real Stripe credentials.
 *
 * Never returned in production: `getStripeService()` throws there.
 */
class StubStripeService implements StripeService {
  async createEventCheckoutSession(input: CreateEventCheckoutInput): Promise<StripeCheckoutResult> {
    const sessionId = `cs_stub_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const paymentId = input.metadata['paymentId'] ?? '';
    const base = env.API_BASE_URL.replace(/\/+$/, '');
    return {
      sessionId,
      // Browsable dev page that lets the user simulate success/cancel.
      url: `${base}/api/v1/payments/_dev/checkout?session=${sessionId}&paymentId=${paymentId}`,
      paymentIntentId: `pi_stub_${sessionId}`,
    };
  }
  async createSubscriptionCheckoutSession(
    input: CreateSubscriptionCheckoutInput,
  ): Promise<StripeCheckoutResult> {
    const sessionId = `cs_stub_sub_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const base = env.API_BASE_URL.replace(/\/+$/, '');
    return {
      sessionId,
      url: `${base}/api/v1/payments/_dev/checkout?session=${sessionId}&kind=subscription&communityId=${input.metadata['communityId']}&userId=${input.metadata['userId']}&plan=${input.metadata['plan']}`,
    };
  }
  async cancelSubscription(_stripeSubscriptionId: string): Promise<{
    status: string;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd?: Date;
  }> {
    return {
      status: 'active',
      cancelAtPeriodEnd: true,
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };
  }
  async refundPaymentIntent(input: RefundInput): Promise<{
    refundId: string;
    amountCents: number;
    status: string;
  }> {
    return {
      refundId: `re_stub_${Date.now()}`,
      amountCents: input.amountCents ?? 0,
      status: 'succeeded',
    };
  }
  verifyWebhookEvent(_rawBody: Buffer, _signature: string): Stripe.Event {
    throw AppError.invalidInput('Webhook verification is not supported in stub mode.');
  }
}

let instance: StripeService | null = null;

export function getStripeService(): StripeService {
  if (instance) return instance;
  if (!env.STRIPE_SECRET_KEY) {
    if (env.NODE_ENV === 'production') {
      throw AppError.internal(
        'Stripe is not configured. Set STRIPE_SECRET_KEY in production .env to enable payments.',
      );
    }
    // Dev convenience: fall through to a deterministic stub so screens are demoable
    // without real Stripe keys. Log loudly so it's never confused for real.
    // eslint-disable-next-line no-console
    console.warn(
      '[stripe.service] STRIPE_SECRET_KEY missing — using StubStripeService (dev only).',
    );
    instance = new StubStripeService();
    return instance;
  }
  instance = new RealStripeService(env.STRIPE_SECRET_KEY);
  return instance;
}

// Test-only swap.
export function _resetStripeService(svc: StripeService | null): void {
  instance = svc;
}
