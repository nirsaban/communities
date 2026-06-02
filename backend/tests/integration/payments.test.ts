import request from 'supertest';
import { getApp } from '../helpers/app';
import {
  makeUser,
  makeCommunity,
  makeMember,
  authHeader,
} from '../helpers/factory';
import { _resetStripeService } from '../../src/services/stripe.service';
import { FakeStripeService, signWebhookBody } from '../helpers/fakeStripe';
import { Payment } from '../../src/models/Payment';
import { Subscription } from '../../src/models/Subscription';
import { EventRSVP } from '../../src/models/EventRSVP';

function iso(hoursFromNow: number): string {
  return new Date(Date.now() + hoursFromNow * 3_600_000).toISOString();
}

let fakeStripe: FakeStripeService;

beforeEach(() => {
  fakeStripe = new FakeStripeService();
  _resetStripeService(fakeStripe);
  process.env.STRIPE_WEBHOOK_SECRET = fakeStripe.webhookSecret;
  process.env.STRIPE_SUBSCRIPTION_MONTHLY_PRICE_ID = 'price_test_monthly';
  process.env.STRIPE_SUBSCRIPTION_ANNUAL_PRICE_ID = 'price_test_annual';
});

afterAll(() => {
  _resetStripeService(null);
});

async function createPaidEvent(adminToken: string, communityId: string): Promise<string> {
  const app = await getApp();
  const res = await request(app)
    .post(`/api/v1/communities/${communityId}/events`)
    .set(authHeader(adminToken))
    .send({
      title: 'Paid Lecture',
      startAt: iso(48),
      endAt: iso(49),
      pricing: { type: 'paid', priceCents: 2500, currency: 'USD' },
      status: 'published',
    });
  expect(res.status).toBe(201);
  return res.body.data.id;
}

describe('POST /api/v1/events/:eid/checkout', () => {
  it('returns 201 with sessionUrl for a paid event', async () => {
    const app = await getApp();
    const { user: admin, accessToken: adminToken } = await makeUser();
    const community = await makeCommunity();
    await makeMember(admin, community, 'admin');
    const eventId = await createPaidEvent(adminToken, String(community._id));

    const { user: member, accessToken: memberToken } = await makeUser();
    await makeMember(member, community, 'member');

    const res = await request(app)
      .post(`/api/v1/events/${eventId}/checkout`)
      .set(authHeader(memberToken));
    expect(res.status).toBe(201);
    expect(res.body.data.sessionUrl).toMatch(/^https:\/\/stripe\.test\/checkout\//);
    expect(res.body.data.paymentId).toEqual(expect.any(String));
    const payments = await Payment.find({});
    expect(payments).toHaveLength(1);
    expect(payments[0].status).toBe('pending');
    expect(payments[0].amountCents).toBe(2500);
  });

  it('returns 400 for a free event', async () => {
    const app = await getApp();
    const { user: admin, accessToken: adminToken } = await makeUser();
    const community = await makeCommunity();
    await makeMember(admin, community, 'admin');
    const create = await request(app)
      .post(`/api/v1/communities/${community._id}/events`)
      .set(authHeader(adminToken))
      .send({
        title: 'Free thing',
        startAt: iso(24),
        endAt: iso(25),
        pricing: { type: 'free', priceCents: 0, currency: 'USD' },
        status: 'published',
      });
    const eventId = create.body.data.id;

    const { user: member, accessToken: memberToken } = await makeUser();
    await makeMember(member, community, 'member');
    const res = await request(app)
      .post(`/api/v1/events/${eventId}/checkout`)
      .set(authHeader(memberToken));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_INPUT');
  });

  it('Sub Admin can call /checkout (they are paying as a member)', async () => {
    const app = await getApp();
    const { user: admin, accessToken: adminToken } = await makeUser();
    const community = await makeCommunity();
    await makeMember(admin, community, 'admin');
    const eventId = await createPaidEvent(adminToken, String(community._id));

    const { user: sub, accessToken: subToken } = await makeUser();
    await makeMember(sub, community, 'subadmin');

    const res = await request(app)
      .post(`/api/v1/events/${eventId}/checkout`)
      .set(authHeader(subToken));
    expect(res.status).toBe(201);
  });

  it('non-member is rejected with 404 (event not visible)', async () => {
    const app = await getApp();
    const { user: admin, accessToken: adminToken } = await makeUser();
    const community = await makeCommunity();
    await makeMember(admin, community, 'admin');
    const eventId = await createPaidEvent(adminToken, String(community._id));

    const { accessToken: strangerToken } = await makeUser();
    const res = await request(app)
      .post(`/api/v1/events/${eventId}/checkout`)
      .set(authHeader(strangerToken));
    expect(res.status).toBe(404);
  });
});

describe('POST /api/v1/events/:eid/rsvp on paid events returns 402 with checkoutUrl', () => {
  it('member RSVPing a paid event gets 402 + Stripe URL', async () => {
    const app = await getApp();
    const { user: admin, accessToken: adminToken } = await makeUser();
    const community = await makeCommunity();
    await makeMember(admin, community, 'admin');
    const eventId = await createPaidEvent(adminToken, String(community._id));

    const { user: member, accessToken: memberToken } = await makeUser();
    await makeMember(member, community, 'member');

    const res = await request(app)
      .post(`/api/v1/events/${eventId}/rsvp`)
      .set(authHeader(memberToken))
      .send({ status: 'going' });
    expect(res.status).toBe(402);
    expect(res.body.error.code).toBe('PAYMENT_REQUIRED');
    expect(res.body.error.details.checkoutUrl).toMatch(/stripe\.test/);
  });
});

describe('Sub Admin financial blocks', () => {
  it('Sub Admin → /communities/:cid/finances returns 403', async () => {
    const app = await getApp();
    const { user: sub, accessToken: subToken } = await makeUser();
    const community = await makeCommunity();
    await makeMember(sub, community, 'subadmin');
    const res = await request(app)
      .get(`/api/v1/communities/${community._id}/finances`)
      .set(authHeader(subToken));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('Admin → /communities/:cid/finances returns aggregated revenue', async () => {
    const app = await getApp();
    const { user: admin, accessToken: adminToken } = await makeUser();
    const community = await makeCommunity();
    await makeMember(admin, community, 'admin');
    // Seed a succeeded payment.
    await Payment.create({
      communityId: community._id,
      userId: admin._id,
      amountCents: 5000,
      currency: 'USD',
      status: 'succeeded',
    });
    const res = await request(app)
      .get(`/api/v1/communities/${community._id}/finances`)
      .set(authHeader(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.data.totalRevenueCents).toBe(5000);
    expect(res.body.data.revenueThisMonth).toBe(5000);
    expect(res.body.data.activeSubscriptions).toBe(0);
    expect(Array.isArray(res.body.data.revenueByEvent)).toBe(true);
  });

  it('Sub Admin → /events/:eid/payments returns 403', async () => {
    const app = await getApp();
    const { user: admin, accessToken: adminToken } = await makeUser();
    const community = await makeCommunity();
    await makeMember(admin, community, 'admin');
    const eventId = await createPaidEvent(adminToken, String(community._id));

    const { user: sub, accessToken: subToken } = await makeUser();
    await makeMember(sub, community, 'subadmin');
    const res = await request(app)
      .get(`/api/v1/events/${eventId}/payments`)
      .set(authHeader(subToken));
    expect(res.status).toBe(403);
  });
});

describe('Stripe webhooks', () => {
  it('rejects requests with invalid signature (400)', async () => {
    const app = await getApp();
    const body = Buffer.from(
      JSON.stringify({ id: 'evt_bad', type: 'checkout.session.completed', data: { object: {} } }),
    );
    const res = await request(app)
      .post('/api/v1/webhooks/stripe')
      .set('content-type', 'application/json')
      .set('stripe-signature', 'sig_garbage')
      .send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_INPUT');
  });

  it('checkout.session.completed → marks Payment succeeded + creates RSVP', async () => {
    const app = await getApp();
    const { user: admin, accessToken: adminToken } = await makeUser();
    const community = await makeCommunity();
    await makeMember(admin, community, 'admin');
    const eventId = await createPaidEvent(adminToken, String(community._id));
    const { user: member, accessToken: memberToken } = await makeUser();
    await makeMember(member, community, 'member');

    const checkoutRes = await request(app)
      .post(`/api/v1/events/${eventId}/checkout`)
      .set(authHeader(memberToken));
    const paymentId = checkoutRes.body.data.paymentId;
    const lastSession = fakeStripe.sessions[fakeStripe.sessions.length - 1];

    const event = {
      id: 'evt_test_1',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: lastSession.id,
          payment_intent: lastSession.paymentIntentId,
          amount_total: lastSession.amountCents,
          metadata: lastSession.metadata,
        },
      },
    };
    const bodyStr = JSON.stringify(event);
    const sig = signWebhookBody(fakeStripe.webhookSecret, Buffer.from(bodyStr));
    const res = await request(app)
      .post('/api/v1/webhooks/stripe')
      .set('content-type', 'application/json')
      .set('stripe-signature', sig)
      .send(bodyStr);
    expect(res.status).toBe(200);
    expect(res.body.data ?? res.body).toMatchObject({ received: true });

    const payment = await Payment.findById(paymentId);
    expect(payment?.status).toBe('succeeded');
    expect(payment?.stripePaymentIntentId).toBe(lastSession.paymentIntentId);

    const rsvp = await EventRSVP.findOne({ eventId, userId: member._id });
    expect(rsvp?.status).toBe('going');
    expect(rsvp?.paymentStatus).toBe('paid');
  });

  it('webhook idempotency: replaying the same event is a no-op', async () => {
    const app = await getApp();
    const { user: admin, accessToken: adminToken } = await makeUser();
    const community = await makeCommunity();
    await makeMember(admin, community, 'admin');
    const eventId = await createPaidEvent(adminToken, String(community._id));
    const { user: member, accessToken: memberToken } = await makeUser();
    await makeMember(member, community, 'member');

    await request(app)
      .post(`/api/v1/events/${eventId}/checkout`)
      .set(authHeader(memberToken));
    const lastSession = fakeStripe.sessions[fakeStripe.sessions.length - 1];

    const event = {
      id: 'evt_dup',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: lastSession.id,
          payment_intent: lastSession.paymentIntentId,
          amount_total: lastSession.amountCents,
          metadata: lastSession.metadata,
        },
      },
    };
    const bodyStr = JSON.stringify(event);
    const sig = signWebhookBody(fakeStripe.webhookSecret, Buffer.from(bodyStr));

    const first = await request(app)
      .post('/api/v1/webhooks/stripe')
      .set('content-type', 'application/json')
      .set('stripe-signature', sig)
      .send(bodyStr);
    expect(first.status).toBe(200);
    const second = await request(app)
      .post('/api/v1/webhooks/stripe')
      .set('content-type', 'application/json')
      .set('stripe-signature', sig)
      .send(bodyStr);
    expect(second.status).toBe(200);
    expect(second.body.data ?? second.body).toMatchObject({ duplicate: true });

    // Exactly one RSVP and one payment row.
    const rsvps = await EventRSVP.find({ eventId, userId: member._id });
    expect(rsvps).toHaveLength(1);
  });

  it('customer.subscription.created creates a Subscription row', async () => {
    const app = await getApp();
    const { user: member } = await makeUser();
    const community = await makeCommunity();
    await makeMember(member, community, 'member');

    const subObj = {
      id: 'sub_test_1',
      status: 'active',
      cancel_at_period_end: false,
      current_period_start: Math.floor(Date.now() / 1000),
      current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
      customer: 'cus_test_1',
      metadata: { userId: String(member._id), communityId: String(community._id), plan: 'monthly' },
    };
    const evt = {
      id: 'evt_sub_create',
      type: 'customer.subscription.created',
      data: { object: subObj },
    };
    const bodyStr = JSON.stringify(evt);
    const sig = signWebhookBody(fakeStripe.webhookSecret, Buffer.from(bodyStr));
    const res = await request(app)
      .post('/api/v1/webhooks/stripe')
      .set('content-type', 'application/json')
      .set('stripe-signature', sig)
      .send(bodyStr);
    expect(res.status).toBe(200);
    const sub = await Subscription.findOne({ stripeSubscriptionId: 'sub_test_1' });
    expect(sub?.status).toBe('active');
    expect(sub?.plan).toBe('monthly');
    expect(String(sub?.userId)).toBe(String(member._id));
  });
});

describe('Webhook extra event types', () => {
  function postWebhook(evt: object) {
    return getApp().then(async (app) => {
      const bodyStr = JSON.stringify(evt);
      const sig = signWebhookBody(fakeStripe.webhookSecret, Buffer.from(bodyStr));
      return request(app)
        .post('/api/v1/webhooks/stripe')
        .set('content-type', 'application/json')
        .set('stripe-signature', sig)
        .send(bodyStr);
    });
  }

  it('payment_intent.payment_failed marks Payment failed', async () => {
    const { user } = await makeUser();
    const community = await makeCommunity();
    const payment = await Payment.create({
      communityId: community._id,
      userId: user._id,
      amountCents: 1000,
      currency: 'USD',
      status: 'pending',
      stripePaymentIntentId: 'pi_failing',
    });
    const res = await postWebhook({
      id: 'evt_pi_fail',
      type: 'payment_intent.payment_failed',
      data: { object: { id: 'pi_failing' } },
    });
    expect(res.status).toBe(200);
    const reloaded = await Payment.findById(payment._id);
    expect(reloaded?.status).toBe('failed');
  });

  it('customer.subscription.updated updates an existing Subscription', async () => {
    const { user } = await makeUser();
    const community = await makeCommunity();
    await Subscription.create({
      communityId: community._id,
      userId: user._id,
      stripeSubscriptionId: 'sub_upd',
      plan: 'monthly',
      status: 'active',
      cancelAtPeriodEnd: false,
    });
    const res = await postWebhook({
      id: 'evt_sub_upd',
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_upd',
          status: 'past_due',
          cancel_at_period_end: true,
          current_period_start: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor(Date.now() / 1000) + 86400,
          customer: 'cus_z',
          metadata: { userId: String(user._id), communityId: String(community._id), plan: 'monthly' },
        },
      },
    });
    expect(res.status).toBe(200);
    const sub = await Subscription.findOne({ stripeSubscriptionId: 'sub_upd' });
    expect(sub?.status).toBe('past_due');
    expect(sub?.cancelAtPeriodEnd).toBe(true);
  });

  it('customer.subscription.deleted marks the Subscription cancelled', async () => {
    const { user } = await makeUser();
    const community = await makeCommunity();
    await Subscription.create({
      communityId: community._id,
      userId: user._id,
      stripeSubscriptionId: 'sub_del',
      plan: 'monthly',
      status: 'active',
    });
    const res = await postWebhook({
      id: 'evt_sub_del',
      type: 'customer.subscription.deleted',
      data: { object: { id: 'sub_del', status: 'canceled' } },
    });
    expect(res.status).toBe(200);
    const sub = await Subscription.findOne({ stripeSubscriptionId: 'sub_del' });
    expect(sub?.status).toBe('cancelled');
  });

  it('charge.refunded syncs Payment refundedAmount and cancels RSVP when fully refunded', async () => {
    const { user: admin, accessToken: adminToken } = await makeUser();
    const community = await makeCommunity();
    await makeMember(admin, community, 'admin');
    const eventId = await createPaidEvent(adminToken, String(community._id));
    const { user: member } = await makeUser();
    await makeMember(member, community, 'member');
    const event = await (await import('../../src/models/Event')).EventModel.findById(eventId);
    const payment = await Payment.create({
      communityId: community._id,
      userId: member._id,
      eventId: event!._id,
      amountCents: 2500,
      currency: 'USD',
      status: 'succeeded',
      stripePaymentIntentId: 'pi_refunded',
    });
    await EventRSVP.create({
      eventId: event!._id,
      communityId: community._id,
      userId: member._id,
      status: 'going',
      paymentStatus: 'paid',
      paymentId: payment._id,
    });

    const res = await postWebhook({
      id: 'evt_charge_refunded',
      type: 'charge.refunded',
      data: {
        object: {
          id: 'ch_x',
          payment_intent: 'pi_refunded',
          amount: 2500,
          amount_refunded: 2500,
        },
      },
    });
    expect(res.status).toBe(200);
    const reloaded = await Payment.findById(payment._id);
    expect(reloaded?.status).toBe('refunded');
    expect(reloaded?.refundedAmountCents).toBe(2500);
    const rsvp = await EventRSVP.findOne({ eventId: event!._id, userId: member._id });
    expect(rsvp?.status).toBe('cancelled');
  });

  it('unknown event types are recorded as not-handled (still 200)', async () => {
    const res = await postWebhook({
      id: 'evt_random',
      type: 'invoice.payment_succeeded',
      data: { object: {} },
    });
    expect(res.status).toBe(200);
    expect(res.body.data ?? res.body).toMatchObject({ handled: false });
  });
});

describe('Subscription-covered RSVP', () => {
  it('member with active subscription on a subscription-included event RSVPs without 402', async () => {
    const app = await getApp();
    const { user: admin, accessToken: adminToken } = await makeUser();
    const community = await makeCommunity();
    await makeMember(admin, community, 'admin');
    const create = await request(app)
      .post(`/api/v1/communities/${community._id}/events`)
      .set(authHeader(adminToken))
      .send({
        title: 'Subs-included Lecture',
        startAt: iso(48),
        endAt: iso(49),
        pricing: {
          type: 'paid',
          priceCents: 5000,
          currency: 'USD',
          subscriptionIncluded: true,
        },
        status: 'published',
      });
    const eventId = create.body.data.id;
    const { user: member, accessToken: memberToken } = await makeUser();
    await makeMember(member, community, 'member');
    await Subscription.create({
      communityId: community._id,
      userId: member._id,
      stripeSubscriptionId: 'sub_active_for_inclusion',
      plan: 'monthly',
      status: 'active',
    });
    const res = await request(app)
      .post(`/api/v1/events/${eventId}/rsvp`)
      .set(authHeader(memberToken))
      .send({ status: 'going' });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('going');
  });
});

describe('Partial refund leaves RSVP intact', () => {
  it('admin issues a partial refund → Payment is partial_refund, RSVP still going', async () => {
    const app = await getApp();
    const { user: admin, accessToken: adminToken } = await makeUser();
    const community = await makeCommunity();
    await makeMember(admin, community, 'admin');
    const eventId = await createPaidEvent(adminToken, String(community._id));
    const { user: member } = await makeUser();
    await makeMember(member, community, 'member');
    const payment = await Payment.create({
      communityId: community._id,
      userId: member._id,
      eventId,
      amountCents: 2500,
      currency: 'USD',
      status: 'succeeded',
      stripePaymentIntentId: 'pi_partial',
    });
    const rsvp = await EventRSVP.create({
      eventId,
      communityId: community._id,
      userId: member._id,
      status: 'going',
      paymentStatus: 'paid',
      paymentId: payment._id,
    });
    const res = await request(app)
      .post(`/api/v1/payments/${payment._id}/refund`)
      .set(authHeader(adminToken))
      .send({ amountCents: 1000 });
    expect(res.status).toBe(200);
    expect(res.body.data.payment.status).toBe('partial_refund');
    expect(res.body.data.rsvp).toBeNull();
    const updatedRsvp = await EventRSVP.findById(rsvp._id);
    expect(updatedRsvp?.status).toBe('going');
  });
});

describe('Refunds', () => {
  it('admin can refund a succeeded payment → Payment refunded + RSVP cancelled', async () => {
    const app = await getApp();
    const { user: admin, accessToken: adminToken } = await makeUser();
    const community = await makeCommunity();
    await makeMember(admin, community, 'admin');
    const eventId = await createPaidEvent(adminToken, String(community._id));
    const { user: member, accessToken: memberToken } = await makeUser();
    await makeMember(member, community, 'member');

    // Checkout + simulate webhook.
    await request(app)
      .post(`/api/v1/events/${eventId}/checkout`)
      .set(authHeader(memberToken));
    const sess = fakeStripe.sessions[0];
    const bodyStr = JSON.stringify({
      id: 'evt_refund_seed',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: sess.id,
          payment_intent: sess.paymentIntentId,
          amount_total: sess.amountCents,
          metadata: sess.metadata,
        },
      },
    });
    await request(app)
      .post('/api/v1/webhooks/stripe')
      .set('content-type', 'application/json')
      .set('stripe-signature', signWebhookBody(fakeStripe.webhookSecret, Buffer.from(bodyStr)))
      .send(bodyStr);

    const payment = await Payment.findOne({ stripeCheckoutSessionId: sess.id });
    expect(payment?.status).toBe('succeeded');

    const refundRes = await request(app)
      .post(`/api/v1/payments/${payment!._id}/refund`)
      .set(authHeader(adminToken))
      .send({ amountCents: 2500 });
    expect(refundRes.status).toBe(200);
    expect(refundRes.body.data.payment.status).toBe('refunded');
    expect(refundRes.body.data.rsvp.status).toBe('cancelled');

    const reloaded = await Payment.findById(payment!._id);
    expect(reloaded?.refundedAmountCents).toBe(2500);
  });

  it('Sub Admin refund attempt returns 403', async () => {
    const app = await getApp();
    const { user: admin } = await makeUser();
    const community = await makeCommunity();
    await makeMember(admin, community, 'admin');
    const { user: sub, accessToken: subToken } = await makeUser();
    await makeMember(sub, community, 'subadmin');

    // Seed a Payment to refund.
    const payment = await Payment.create({
      communityId: community._id,
      userId: admin._id,
      amountCents: 1000,
      currency: 'USD',
      status: 'succeeded',
      stripePaymentIntentId: 'pi_seeded',
    });

    const res = await request(app)
      .post(`/api/v1/payments/${payment._id}/refund`)
      .set(authHeader(subToken))
      .send({});
    expect(res.status).toBe(403);

    // Sanity: admin in a different community also cannot.
    const otherCommunity = await makeCommunity();
    const { user: otherAdmin, accessToken: otherToken } = await makeUser();
    await makeMember(otherAdmin, otherCommunity, 'admin');
    const cross = await request(app)
      .post(`/api/v1/payments/${payment._id}/refund`)
      .set(authHeader(otherToken))
      .send({});
    expect(cross.status).toBe(404);
  });
});

describe('Subscription mgmt', () => {
  it('GET /me/subscriptions lists only the caller subs', async () => {
    const app = await getApp();
    const { user, accessToken } = await makeUser();
    const community = await makeCommunity();
    await makeMember(user, community, 'member');
    await Subscription.create({
      communityId: community._id,
      userId: user._id,
      stripeSubscriptionId: 'sub_mine',
      plan: 'monthly',
      status: 'active',
    });
    // Seed another user's sub which must not leak.
    const { user: other } = await makeUser();
    await Subscription.create({
      communityId: community._id,
      userId: other._id,
      stripeSubscriptionId: 'sub_other',
      plan: 'annual',
      status: 'active',
    });

    const res = await request(app).get('/api/v1/me/subscriptions').set(authHeader(accessToken));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].plan).toBe('monthly');
  });

  it('POST /me/subscriptions/:sid/cancel sets cancel_at_period_end', async () => {
    const app = await getApp();
    const { user, accessToken } = await makeUser();
    const community = await makeCommunity();
    await makeMember(user, community, 'member');
    const sub = await Subscription.create({
      communityId: community._id,
      userId: user._id,
      stripeSubscriptionId: 'sub_to_cancel',
      plan: 'monthly',
      status: 'active',
    });
    const res = await request(app)
      .post(`/api/v1/me/subscriptions/${sub._id}/cancel`)
      .set(authHeader(accessToken));
    expect(res.status).toBe(200);
    expect(res.body.data.cancelAtPeriodEnd).toBe(true);
    expect(fakeStripe.cancellations).toContain('sub_to_cancel');
  });
});

describe('POST /api/v1/communities/:cid/subscribe', () => {
  it('returns 201 with sessionUrl for a member', async () => {
    const app = await getApp();
    const { user, accessToken } = await makeUser();
    const community = await makeCommunity();
    await makeMember(user, community, 'member');
    const res = await request(app)
      .post(`/api/v1/communities/${community._id}/subscribe`)
      .set(authHeader(accessToken))
      .send({ plan: 'monthly' });
    expect(res.status).toBe(201);
    expect(res.body.data.sessionUrl).toMatch(/stripe\.test\/subscription/);
  });

  it('returns 400 when the plan price ID is not configured', async () => {
    // env.STRIPE_SUBSCRIPTION_ANNUAL_PRICE_ID is set by jest.env.ts; temporarily clear the
    // cached module value via re-import is invasive. Instead exercise the negative path by
    // calling the service with the unconfigured plan directly.
    const env = (await import('../../src/config/env')).default;
    const originalAnnual = env.STRIPE_SUBSCRIPTION_ANNUAL_PRICE_ID;
    (env as { STRIPE_SUBSCRIPTION_ANNUAL_PRICE_ID?: string }).STRIPE_SUBSCRIPTION_ANNUAL_PRICE_ID =
      undefined;
    try {
      const app = await getApp();
      const { user, accessToken } = await makeUser();
      const community = await makeCommunity();
      await makeMember(user, community, 'member');
      const res = await request(app)
        .post(`/api/v1/communities/${community._id}/subscribe`)
        .set(authHeader(accessToken))
        .send({ plan: 'annual' });
      expect(res.status).toBe(400);
    } finally {
      (env as { STRIPE_SUBSCRIPTION_ANNUAL_PRICE_ID?: string }).STRIPE_SUBSCRIPTION_ANNUAL_PRICE_ID =
        originalAnnual;
    }
  });
});
