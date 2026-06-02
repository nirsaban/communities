import crypto from 'crypto';
import { verifyHmacSignature } from '../../src/services/payment/PayPlusClient';
import { FakePayPlusClient, signPayPlusWebhook } from '../helpers/fakePayPlus';

describe('verifyHmacSignature', () => {
  const secret = 'whsec_test_payplus';
  const body = Buffer.from(JSON.stringify({ type: 'payment_success' }), 'utf8');

  it('accepts a signature produced with the same secret', () => {
    const sig = crypto.createHmac('sha256', secret).update(body).digest('hex');
    expect(verifyHmacSignature(secret, body, sig)).toBe(true);
  });

  it('rejects a signature with the wrong secret', () => {
    const sig = crypto.createHmac('sha256', 'wrong').update(body).digest('hex');
    expect(verifyHmacSignature(secret, body, sig)).toBe(false);
  });

  it('rejects garbage', () => {
    expect(verifyHmacSignature(secret, body, 'not-a-valid-hex-of-the-right-length')).toBe(false);
    expect(verifyHmacSignature(secret, body, '')).toBe(false);
  });

  it('rejects when the body is mutated post-sign', () => {
    const sig = crypto.createHmac('sha256', secret).update(body).digest('hex');
    expect(verifyHmacSignature(secret, Buffer.concat([body, Buffer.from('x')]), sig)).toBe(false);
  });
});

describe('FakePayPlusClient.createPaymentPage', () => {
  it('returns the expected shape and records the call', async () => {
    const fake = new FakePayPlusClient();
    const result = await fake.createPaymentPage({
      amountCents: 4900,
      currency: 'ILS',
      description: 'Test event',
      maxInstallments: 3,
      successUrl: 'https://api.test/payments/success',
      failureUrl: 'https://api.test/payments/failure',
      notifyUrl: 'https://api.test/webhooks/payplus',
      metadata: {
        paymentId: 'pay-1',
        communityId: 'comm-1',
        userId: 'user-1',
        eventId: 'event-1',
        kind: 'event',
      },
      customerEmail: 'a@b.co',
    });
    expect(result.paymentPageUid).toMatch(/^pp_page_/);
    expect(result.paymentUrl).toMatch(/^https:\/\/payplus\.test\/pay\//);
    expect(fake.pages).toHaveLength(1);
    expect(fake.pages[0].amountCents).toBe(4900);
    expect(fake.pages[0].maxInstallments).toBe(3);
    expect(fake.pages[0].metadata.paymentId).toBe('pay-1');
  });
});

describe('FakePayPlusClient.refund maps params', () => {
  it('records transactionId + amountCents + reason', async () => {
    const fake = new FakePayPlusClient();
    const r = await fake.refund({ transactionId: 'tx-42', amountCents: 1234, reason: 'goodwill' });
    expect(r.status).toBe('succeeded');
    expect(fake.refunds[0]).toMatchObject({
      transactionId: 'tx-42',
      amountCents: 1234,
      reason: 'goodwill',
    });
  });

  it('reports failure when the flag is set', async () => {
    const fake = new FakePayPlusClient();
    fake.nextRefundFails = true;
    const r = await fake.refund({ transactionId: 'tx-1', amountCents: 100 });
    expect(r.status).toBe('failed');
  });
});

describe('signPayPlusWebhook helper', () => {
  it('round-trips with verifyHmacSignature', () => {
    const body = Buffer.from('{"type":"payment_success"}', 'utf8');
    const sig = signPayPlusWebhook('whsec_test_payplus', body);
    expect(verifyHmacSignature('whsec_test_payplus', body, sig)).toBe(true);
  });
});
