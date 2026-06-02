/**
 * Tests for the RealStripeService wrapper. The real Stripe SDK is mocked at the
 * module level so we can assert wiring (parameters passed, fee math, error
 * translation) without making network calls.
 */
import { _resetStripeService } from '../../src/services/stripe.service';

// Capture the most recent params each SDK method received so we can assert in
// individual tests. Using module-level state because jest.mock factories run
// before `beforeEach`.
const calls: {
  checkoutCreate: unknown[];
  subscriptionsUpdate: unknown[];
  refundsCreate: unknown[];
  webhookConstruct: unknown[];
} = {
  checkoutCreate: [],
  subscriptionsUpdate: [],
  refundsCreate: [],
  webhookConstruct: [],
};

jest.mock('stripe', () => {
  // Default Stripe export is a constructor returning an object of resources.
  return jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: jest.fn(async (params: unknown, opts?: unknown) => {
          calls.checkoutCreate.push({ params, opts });
          const isSubscription =
            typeof params === 'object' &&
            params !== null &&
            (params as { mode?: string }).mode === 'subscription';
          return {
            id: 'cs_mock_1',
            url: isSubscription ? 'https://stripe/sub/cs_mock_1' : 'https://stripe/evt/cs_mock_1',
            payment_intent: isSubscription ? null : 'pi_mock_1',
          };
        }),
      },
    },
    subscriptions: {
      update: jest.fn(async (id: string, params: unknown) => {
        calls.subscriptionsUpdate.push({ id, params });
        return {
          status: 'active',
          cancel_at_period_end: true,
          current_period_end: Math.floor(Date.now() / 1000) + 86400,
        };
      }),
    },
    refunds: {
      create: jest.fn(async (params: unknown, opts?: unknown) => {
        calls.refundsCreate.push({ params, opts });
        return { id: 're_mock_1', amount: (params as { amount?: number }).amount ?? 0, status: 'succeeded' };
      }),
    },
    webhooks: {
      constructEvent: jest.fn((rawBody: Buffer, signature: string, secret: string) => {
        calls.webhookConstruct.push({ rawBody, signature, secret });
        if (signature === 'bad') {
          throw new Error('No signatures found matching the expected signature for payload');
        }
        return JSON.parse(rawBody.toString('utf8'));
      }),
    },
  }));
});

// Imported after jest.mock so the constructor mock is in place.
import {
  getStripeService,
} from '../../src/services/stripe.service';

beforeEach(() => {
  _resetStripeService(null);
  calls.checkoutCreate.length = 0;
  calls.subscriptionsUpdate.length = 0;
  calls.refundsCreate.length = 0;
  calls.webhookConstruct.length = 0;
});

describe('RealStripeService (jest.mock stripe)', () => {
  it('createEventCheckoutSession passes amount/currency/customer + computes platform fee', async () => {
    const svc = getStripeService();
    const result = await svc.createEventCheckoutSession({
      amountCents: 10_000,
      currency: 'usd',
      eventTitle: 'X',
      customerEmail: 'a@b.co',
      successUrl: 'http://succ',
      cancelUrl: 'http://can',
      metadata: { kind: 'event' },
      stripeAccountId: 'acct_x',
      applicationFeeBps: 500, // 5%
    });
    expect(result.sessionId).toBe('cs_mock_1');
    expect(result.paymentIntentId).toBe('pi_mock_1');
    expect(calls.checkoutCreate).toHaveLength(1);
    const { params, opts } = calls.checkoutCreate[0] as {
      params: { line_items: { price_data: { unit_amount: number; currency: string } }[]; payment_intent_data: { application_fee_amount?: number } };
      opts: { stripeAccount: string };
    };
    expect(params.line_items[0].price_data.unit_amount).toBe(10_000);
    expect(params.line_items[0].price_data.currency).toBe('usd');
    expect(params.payment_intent_data.application_fee_amount).toBe(500); // 5% of 10000
    expect(opts.stripeAccount).toBe('acct_x');
  });

  it('createSubscriptionCheckoutSession uses mode=subscription', async () => {
    const svc = getStripeService();
    const result = await svc.createSubscriptionCheckoutSession({
      priceId: 'price_x',
      customerEmail: 'a@b.co',
      successUrl: 'http://s',
      cancelUrl: 'http://c',
      metadata: { kind: 'subscription', plan: 'monthly' },
    });
    expect(result.url).toMatch(/sub/);
    const { params } = calls.checkoutCreate[0] as {
      params: { mode: string; line_items: { price: string }[] };
    };
    expect(params.mode).toBe('subscription');
    expect(params.line_items[0].price).toBe('price_x');
  });

  it('cancelSubscription sets cancel_at_period_end=true on Stripe', async () => {
    const svc = getStripeService();
    const result = await svc.cancelSubscription('sub_999');
    expect(result.cancelAtPeriodEnd).toBe(true);
    expect(calls.subscriptionsUpdate[0]).toMatchObject({
      id: 'sub_999',
      params: { cancel_at_period_end: true },
    });
  });

  it('refundPaymentIntent forwards amount and account', async () => {
    const svc = getStripeService();
    const r = await svc.refundPaymentIntent({
      paymentIntentId: 'pi_x',
      amountCents: 2500,
      stripeAccountId: 'acct_x',
      reason: 'duplicate',
    });
    expect(r.amountCents).toBe(2500);
    expect(r.status).toBe('succeeded');
    const { params, opts } = calls.refundsCreate[0] as {
      params: { payment_intent: string; amount: number; reason: string };
      opts: { stripeAccount: string };
    };
    expect(params.payment_intent).toBe('pi_x');
    expect(params.amount).toBe(2500);
    expect(params.reason).toBe('duplicate');
    expect(opts.stripeAccount).toBe('acct_x');
  });

  it('verifyWebhookEvent delegates to stripe.webhooks.constructEvent', () => {
    const svc = getStripeService();
    const body = Buffer.from(JSON.stringify({ id: 'evt', type: 'noop', data: { object: {} } }));
    const evt = svc.verifyWebhookEvent(body, 'good');
    expect(evt.id).toBe('evt');
  });

  it('verifyWebhookEvent throws AppError on bad signature', () => {
    const svc = getStripeService();
    expect(() => svc.verifyWebhookEvent(Buffer.from('{}'), 'bad')).toThrow(/signature/i);
  });
});
