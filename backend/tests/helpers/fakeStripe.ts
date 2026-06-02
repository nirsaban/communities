import crypto from 'crypto';
import type Stripe from 'stripe';
import { AppError } from '../../src/utils/AppError';
import type {
  StripeService,
  CreateEventCheckoutInput,
  CreateSubscriptionCheckoutInput,
  RefundInput,
  StripeCheckoutResult,
} from '../../src/services/stripe.service';

interface SessionRecord {
  id: string;
  paymentIntentId: string;
  url: string;
  metadata: Record<string, string>;
  amountCents: number;
  currency: string;
  customerEmail: string;
  type: 'event' | 'subscription';
  plan?: string;
}

interface RefundRecord {
  id: string;
  paymentIntentId: string;
  amountCents: number;
}

export class FakeStripeService implements StripeService {
  public readonly sessions: SessionRecord[] = [];
  public readonly refunds: RefundRecord[] = [];
  public readonly cancellations: string[] = [];

  // Tests set this to a hex secret; verifyWebhookEvent uses HMAC-SHA256 over the raw body.
  public webhookSecret = 'whsec_test_secret_value';

  async createEventCheckoutSession(input: CreateEventCheckoutInput): Promise<StripeCheckoutResult> {
    const id = `cs_test_${crypto.randomBytes(8).toString('hex')}`;
    const pi = `pi_test_${crypto.randomBytes(8).toString('hex')}`;
    const url = `https://stripe.test/checkout/${id}`;
    this.sessions.push({
      id,
      paymentIntentId: pi,
      url,
      metadata: input.metadata,
      amountCents: input.amountCents,
      currency: input.currency,
      customerEmail: input.customerEmail,
      type: 'event',
    });
    return { sessionId: id, url, paymentIntentId: pi };
  }

  async createSubscriptionCheckoutSession(
    input: CreateSubscriptionCheckoutInput,
  ): Promise<StripeCheckoutResult> {
    const id = `cs_test_${crypto.randomBytes(8).toString('hex')}`;
    const url = `https://stripe.test/subscription/${id}`;
    this.sessions.push({
      id,
      paymentIntentId: '',
      url,
      metadata: input.metadata,
      amountCents: 0,
      currency: 'USD',
      customerEmail: input.customerEmail,
      type: 'subscription',
      plan: input.metadata.plan,
    });
    return { sessionId: id, url };
  }

  async cancelSubscription(stripeSubscriptionId: string): Promise<{
    status: string;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd?: Date;
  }> {
    this.cancellations.push(stripeSubscriptionId);
    const end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return { status: 'active', cancelAtPeriodEnd: true, currentPeriodEnd: end };
  }

  async refundPaymentIntent(input: RefundInput): Promise<{
    refundId: string;
    amountCents: number;
    status: string;
  }> {
    // For full refunds (amountCents omitted) we record 0; tests pass the full amount explicitly.
    const id = `re_test_${crypto.randomBytes(6).toString('hex')}`;
    const amountCents = input.amountCents ?? 0;
    this.refunds.push({ id, paymentIntentId: input.paymentIntentId, amountCents });
    return { refundId: id, amountCents, status: 'succeeded' };
  }

  verifyWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
    // Tests compute the same HMAC; mismatch throws to mimic stripe SDK.
    const expected = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(rawBody)
      .digest('hex');
    if (signature !== expected) {
      throw AppError.invalidInput('Stripe webhook signature verification failed (fake)');
    }
    return JSON.parse(rawBody.toString('utf8')) as Stripe.Event;
  }
}

export function signWebhookBody(secret: string, body: Buffer): string {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}
