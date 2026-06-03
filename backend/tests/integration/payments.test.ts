import request from 'supertest';
import { getApp } from '../helpers/app';
import { makeUser, makeCommunity, makeMember, authHeader } from '../helpers/factory';
import { _resetPayPlusClient } from '../../src/services/payment/PayPlusClient';
import { FakePayPlusClient, signPayPlusWebhook } from '../helpers/fakePayPlus';
import { Payment } from '../../src/models/Payment';
import { Subscription } from '../../src/models/Subscription';
import { EventRSVP } from '../../src/models/EventRSVP';
import { EventModel } from '../../src/models/Event';

function iso(hoursFromNow: number): string {
  return new Date(Date.now() + hoursFromNow * 3_600_000).toISOString();
}

let fake: FakePayPlusClient;

beforeEach(() => {
  fake = new FakePayPlusClient();
  _resetPayPlusClient(fake);
  process.env.PAYPLUS_WEBHOOK_SECRET = fake.webhookSecret;
});

afterAll(() => {
  _resetPayPlusClient(null);
});

async function createPaidEvent(
  adminToken: string,
  communityId: string,
  opts: { priceCents?: number; maxInstallments?: number } = {},
): Promise<string> {
  const app = await getApp();
  const res = await request(app)
    .post(`/api/v1/communities/${communityId}/events`)
    .set(authHeader(adminToken))
    .send({
      title: 'Paid Lecture',
      startAt: iso(48),
      endAt: iso(49),
      pricing: {
        type: 'paid',
        priceCents: opts.priceCents ?? 4900,
        currency: 'ILS',
        maxInstallments: opts.maxInstallments ?? 3,
      },
      status: 'published',
    });
  expect(res.status).toBe(201);
  return res.body.data.id;
}

describe('POST /api/v1/events/:eid/checkout', () => {
  it('creates a pending Payment + returns paymentUrl', async () => {
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
    expect(res.body.data.paymentUrl).toMatch(/^https:\/\/payplus\.test\/pay\//);
    expect(res.body.data.paymentId).toEqual(expect.any(String));
    const payments = await Payment.find({});
    expect(payments).toHaveLength(1);
    expect(payments[0].status).toBe('pending');
    expect(payments[0].gateway).toBe('payplus');
    expect(payments[0].currency).toBe('ILS');
    expect(payments[0].amountCents).toBe(4900);
    // The PayPlus page was passed our event's maxInstallments.
    expect(fake.pages).toHaveLength(1);
    expect(fake.pages[0].maxInstallments).toBe(3);
  });

  it('never returns the gatewayToken to clients', async () => {
    const app = await getApp();
    const { user: member, accessToken } = await makeUser();
    const community = await makeCommunity();
    await makeMember(member, community, 'member');
    // Seed a Subscription with a token; ensure GET /me/subscriptions does NOT expose it.
    await Subscription.create({
      communityId: community._id,
      userId: member._id,
      gateway: 'payplus',
      gatewaySubscriptionId: 'pp_rec_seed',
      gatewayToken: 'pp_tok_secret',
      plan: 'monthly',
      status: 'active',
    });
    const res = await request(app)
      .get('/api/v1/me/subscriptions')
      .set(authHeader(accessToken));
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toContain('pp_tok_secret');
    expect(JSON.stringify(res.body)).not.toContain('gatewayToken');
  });
});

describe('PayPlus webhook /api/v1/webhooks/payplus', () => {
  it('rejects requests with invalid signature (401)', async () => {
    const app = await getApp();
    const bodyStr = JSON.stringify({ id: 'evt_bad', type: 'payment_success', data: {} });
    const res = await request(app)
      .post('/api/v1/webhooks/payplus')
      .set('content-type', 'application/json')
      .set('x-payplus-signature', 'sig_garbage')
      .send(bodyStr);
    expect(res.status).toBe(401);
  });

  it('payment_success → Payment succeeded + RSVP going', async () => {
    const app = await getApp();
    const { user: admin, accessToken: adminToken } = await makeUser();
    const community = await makeCommunity();
    await makeMember(admin, community, 'admin');
    const eventId = await createPaidEvent(adminToken, String(community._id));
    const { user: member, accessToken: memberToken } = await makeUser();
    await makeMember(member, community, 'member');

    const checkout = await request(app)
      .post(`/api/v1/events/${eventId}/checkout`)
      .set(authHeader(memberToken));
    const paymentId = checkout.body.data.paymentId;
    const lastPage = fake.pages[fake.pages.length - 1];

    const payload = {
      id: 'evt_payment_success_1',
      type: 'payment_success',
      data: {
        transaction_uid: 'pp_tx_success_1',
        number_of_payments: 3,
        more_info: JSON.stringify(lastPage.metadata),
      },
    };
    const bodyStr = JSON.stringify(payload);
    const sig = signPayPlusWebhook(fake.webhookSecret, Buffer.from(bodyStr));
    const res = await request(app)
      .post('/api/v1/webhooks/payplus')
      .set('content-type', 'application/json')
      .set('x-payplus-signature', sig)
      .send(bodyStr);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ received: true, handled: true });

    const payment = await Payment.findById(paymentId);
    expect(payment?.status).toBe('succeeded');
    expect(payment?.gatewayTransactionId).toBe('pp_tx_success_1');
    expect(payment?.installments).toBe(3);
    const rsvp = await EventRSVP.findOne({ eventId, userId: member._id });
    expect(rsvp?.status).toBe('going');
    expect(rsvp?.paymentStatus).toBe('paid');
  });

  it('idempotent: replaying the same payment_success does nothing', async () => {
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
    const lastPage = fake.pages[fake.pages.length - 1];
    const payload = {
      id: 'evt_dup',
      type: 'payment_success',
      data: {
        transaction_uid: 'pp_tx_dup',
        more_info: JSON.stringify(lastPage.metadata),
      },
    };
    const bodyStr = JSON.stringify(payload);
    const sig = signPayPlusWebhook(fake.webhookSecret, Buffer.from(bodyStr));

    const first = await request(app)
      .post('/api/v1/webhooks/payplus')
      .set('content-type', 'application/json')
      .set('x-payplus-signature', sig)
      .send(bodyStr);
    expect(first.status).toBe(200);
    const second = await request(app)
      .post('/api/v1/webhooks/payplus')
      .set('content-type', 'application/json')
      .set('x-payplus-signature', sig)
      .send(bodyStr);
    expect(second.status).toBe(200);
    expect(second.body).toMatchObject({ duplicate: true });

    const rsvps = await EventRSVP.find({ eventId, userId: member._id });
    expect(rsvps).toHaveLength(1);
  });

  it('payment_failure flips the Payment to failed', async () => {
    const app = await getApp();
    const { user } = await makeUser();
    const community = await makeCommunity();
    await makeMember(user, community, 'member');
    const payment = await Payment.create({
      communityId: community._id,
      userId: user._id,
      gateway: 'payplus',
      amountCents: 1000,
      currency: 'ILS',
      status: 'pending',
    });
    const payload = {
      id: 'evt_fail',
      type: 'payment_failure',
      data: {
        more_info: JSON.stringify({
          paymentId: String(payment._id),
          communityId: String(community._id),
          userId: String(user._id),
          kind: 'event',
        }),
      },
    };
    const bodyStr = JSON.stringify(payload);
    const sig = signPayPlusWebhook(fake.webhookSecret, Buffer.from(bodyStr));
    const res = await request(app)
      .post('/api/v1/webhooks/payplus')
      .set('content-type', 'application/json')
      .set('x-payplus-signature', sig)
      .send(bodyStr);
    expect(res.status).toBe(200);
    const reloaded = await Payment.findById(payment._id);
    expect(reloaded?.status).toBe('failed');
  });

  it('recurring_payment_success extends the period + resets failedAttempts', async () => {
    const app = await getApp();
    const { user } = await makeUser();
    const community = await makeCommunity();
    await makeMember(user, community, 'member');
    const sub = await Subscription.create({
      communityId: community._id,
      userId: user._id,
      gateway: 'payplus',
      gatewaySubscriptionId: 'pp_rec_x',
      plan: 'monthly',
      status: 'past_due',
      failedAttempts: 2,
    });
    const payload = {
      id: 'evt_rec_success',
      type: 'recurring_payment_success',
      data: {
        transaction_uid: 'pp_tx_renew',
        amount: 49,
        currency_code: 'ILS',
        more_info: JSON.stringify({
          subscriptionId: String(sub._id),
          communityId: String(community._id),
          userId: String(user._id),
          kind: 'subscription',
        }),
      },
    };
    const bodyStr = JSON.stringify(payload);
    const sig = signPayPlusWebhook(fake.webhookSecret, Buffer.from(bodyStr));
    const res = await request(app)
      .post('/api/v1/webhooks/payplus')
      .set('content-type', 'application/json')
      .set('x-payplus-signature', sig)
      .send(bodyStr);
    expect(res.status).toBe(200);
    const reloaded = await Subscription.findById(sub._id);
    expect(reloaded?.status).toBe('active');
    expect(reloaded?.failedAttempts).toBe(0);
    expect(reloaded?.currentPeriodEnd).toBeDefined();
  });
});

describe('POST /api/v1/payments/:pid/refund', () => {
  it('admin refund → Payment refunded + RSVP cancelled', async () => {
    const app = await getApp();
    const { user: admin, accessToken: adminToken } = await makeUser();
    const community = await makeCommunity();
    await makeMember(admin, community, 'admin');
    const eventId = await createPaidEvent(adminToken, String(community._id), {
      maxInstallments: 1,
    });
    const event = await EventModel.findById(eventId);
    const { user: member } = await makeUser();
    await makeMember(member, community, 'member');
    const payment = await Payment.create({
      communityId: community._id,
      userId: member._id,
      eventId: event!._id,
      gateway: 'payplus',
      gatewayTransactionId: 'pp_tx_to_refund',
      amountCents: 4900,
      currency: 'ILS',
      status: 'succeeded',
    });
    await EventRSVP.create({
      eventId: event!._id,
      communityId: community._id,
      userId: member._id,
      status: 'going',
      paymentStatus: 'paid',
      paymentId: payment._id,
    });
    const res = await request(app)
      .post(`/api/v1/payments/${payment._id}/refund`)
      .set(authHeader(adminToken))
      .send({ amountCents: 4900 });
    expect(res.status).toBe(200);
    expect(res.body.data.payment.status).toBe('refunded');
    expect(res.body.data.rsvp.status).toBe('cancelled');
    expect(fake.refunds).toHaveLength(1);
    expect(fake.refunds[0].transactionId).toBe('pp_tx_to_refund');
  });

  it('Sub Admin refund → 403', async () => {
    const app = await getApp();
    const { user: admin } = await makeUser();
    const community = await makeCommunity();
    await makeMember(admin, community, 'admin');
    const { user: sub, accessToken: subToken } = await makeUser();
    await makeMember(sub, community, 'subadmin');
    const payment = await Payment.create({
      communityId: community._id,
      userId: admin._id,
      gateway: 'payplus',
      gatewayTransactionId: 'pp_tx_seed',
      amountCents: 1000,
      currency: 'ILS',
      status: 'succeeded',
    });
    const res = await request(app)
      .post(`/api/v1/payments/${payment._id}/refund`)
      .set(authHeader(subToken))
      .send({});
    expect(res.status).toBe(403);
  });

  it('refund outside the refundPolicyHours window → 400', async () => {
    const app = await getApp();
    const { user: admin, accessToken: adminToken } = await makeUser();
    const community = await makeCommunity();
    await makeMember(admin, community, 'admin');
    // Event with a 1-hour refund policy.
    const create = await request(app)
      .post(`/api/v1/communities/${community._id}/events`)
      .set(authHeader(adminToken))
      .send({
        title: 'Refund-window event',
        startAt: iso(48),
        endAt: iso(49),
        pricing: {
          type: 'paid',
          priceCents: 1500,
          currency: 'ILS',
          refundPolicyHours: 1,
        },
        status: 'published',
      });
    const eventId = create.body.data.id;
    const { user: member } = await makeUser();
    await makeMember(member, community, 'member');
    // Payment created 2 hours ago — outside the window.
    const payment = await Payment.create({
      communityId: community._id,
      userId: member._id,
      eventId,
      gateway: 'payplus',
      gatewayTransactionId: 'pp_tx_late',
      amountCents: 1500,
      currency: 'ILS',
      status: 'succeeded',
      createdAt: new Date(Date.now() - 2 * 3_600_000),
    });
    const res = await request(app)
      .post(`/api/v1/payments/${payment._id}/refund`)
      .set(authHeader(adminToken))
      .send({ amountCents: 1500 });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/v1/communities/:cid/subscribe', () => {
  it('returns 201 with paymentUrl + creates incomplete Subscription', async () => {
    const app = await getApp();
    const { user, accessToken } = await makeUser();
    const community = await makeCommunity();
    await makeMember(user, community, 'member');
    const res = await request(app)
      .post(`/api/v1/communities/${community._id}/subscribe`)
      .set(authHeader(accessToken))
      .send({ plan: 'monthly' });
    expect(res.status).toBe(201);
    expect(res.body.data.paymentUrl).toMatch(/^https:\/\/payplus\.test\/recur\//);
    const subs = await Subscription.find({});
    expect(subs).toHaveLength(1);
    expect(subs[0].status).toBe('incomplete');
    expect(subs[0].gateway).toBe('payplus');
  });
});

describe('POST /api/v1/me/subscriptions/:sid/cancel', () => {
  it('flips cancelAtPeriodEnd to true', async () => {
    const app = await getApp();
    const { user, accessToken } = await makeUser();
    const community = await makeCommunity();
    await makeMember(user, community, 'member');
    const sub = await Subscription.create({
      communityId: community._id,
      userId: user._id,
      gateway: 'payplus',
      gatewaySubscriptionId: 'pp_rec_cancel_me',
      plan: 'monthly',
      status: 'active',
    });
    const res = await request(app)
      .post(`/api/v1/me/subscriptions/${sub._id}/cancel`)
      .set(authHeader(accessToken));
    expect(res.status).toBe(200);
    expect(res.body.data.cancelAtPeriodEnd).toBe(true);
    expect(fake.cancellations).toContain('pp_rec_cancel_me');
  });
});

describe('GET /api/v1/payments/success', () => {
  it('returns unknown when ref is missing or invalid', async () => {
    const app = await getApp();
    const res = await request(app).get('/api/v1/payments/success');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('unknown');
  });

  it('returns the Payment status when ref is valid', async () => {
    const app = await getApp();
    const { user } = await makeUser();
    const community = await makeCommunity();
    const payment = await Payment.create({
      communityId: community._id,
      userId: user._id,
      gateway: 'payplus',
      amountCents: 4900,
      currency: 'ILS',
      installments: 3,
      status: 'succeeded',
    });
    const res = await request(app).get(`/api/v1/payments/success?ref=${payment._id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('succeeded');
    expect(res.body.data.installments).toBe(3);
    // gatewayToken must not appear.
    expect(JSON.stringify(res.body)).not.toContain('gatewayToken');
  });
});
