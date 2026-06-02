import { FakeStripeService, signWebhookBody } from '../helpers/fakeStripe';
import {
  _resetStripeService,
  getStripeService,
} from '../../src/services/stripe.service';

describe('StripeService (via FakeStripeService swap)', () => {
  let fake: FakeStripeService;
  beforeEach(() => {
    fake = new FakeStripeService();
    _resetStripeService(fake);
  });
  afterAll(() => _resetStripeService(null));

  it('createEventCheckoutSession returns a session id + url + payment intent', async () => {
    const svc = getStripeService();
    const result = await svc.createEventCheckoutSession({
      amountCents: 1500,
      currency: 'USD',
      eventTitle: 'Lecture',
      customerEmail: 'a@b.co',
      successUrl: 'https://app/success',
      cancelUrl: 'https://app/cancel',
      metadata: { kind: 'event' },
    });
    expect(result.sessionId).toMatch(/^cs_test_/);
    expect(result.url).toMatch(/https:\/\/stripe\.test\/checkout/);
    expect(result.paymentIntentId).toMatch(/^pi_test_/);
    expect(fake.sessions).toHaveLength(1);
    expect(fake.sessions[0].amountCents).toBe(1500);
  });

  it('createSubscriptionCheckoutSession records the plan', async () => {
    const svc = getStripeService();
    await svc.createSubscriptionCheckoutSession({
      priceId: 'price_x',
      customerEmail: 'a@b.co',
      successUrl: 'https://app/success',
      cancelUrl: 'https://app/cancel',
      metadata: { kind: 'subscription', plan: 'annual' },
    });
    expect(fake.sessions[0].type).toBe('subscription');
    expect(fake.sessions[0].plan).toBe('annual');
  });

  it('cancelSubscription marks at-period-end', async () => {
    const svc = getStripeService();
    const r = await svc.cancelSubscription('sub_123');
    expect(r.cancelAtPeriodEnd).toBe(true);
    expect(fake.cancellations).toContain('sub_123');
  });

  it('refundPaymentIntent records the refund and returns succeeded', async () => {
    const svc = getStripeService();
    const r = await svc.refundPaymentIntent({ paymentIntentId: 'pi_x', amountCents: 500 });
    expect(r.amountCents).toBe(500);
    expect(r.status).toBe('succeeded');
    expect(fake.refunds[0].paymentIntentId).toBe('pi_x');
  });

  it('verifyWebhookEvent throws on bad signature', () => {
    const svc = getStripeService();
    const body = Buffer.from(JSON.stringify({ id: 'evt', type: 'x', data: { object: {} } }));
    expect(() => svc.verifyWebhookEvent(body, 'wrong')).toThrow(/signature/i);
  });

  it('verifyWebhookEvent returns the parsed event when signature matches', () => {
    const svc = getStripeService();
    const body = Buffer.from(JSON.stringify({ id: 'evt_ok', type: 'noop', data: { object: {} } }));
    const sig = signWebhookBody(fake.webhookSecret, body);
    const evt = svc.verifyWebhookEvent(body, sig);
    expect(evt.id).toBe('evt_ok');
    expect(evt.type).toBe('noop');
  });
});
