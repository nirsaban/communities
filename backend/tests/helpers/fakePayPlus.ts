import crypto from 'crypto';
import type {
  PayPlusClient,
  CreatePaymentPageInput,
  CreatePaymentPageResult,
  CreateRecurringInput,
  CreateRecurringResult,
  ChargeTokenInput,
  ChargeTokenResult,
  RefundInput,
  RefundResult,
  GetTransactionResult,
} from '../../src/services/payment/PayPlusClient';

/**
 * In-memory PayPlusClient used by integration tests. Records every outbound
 * call so assertions can check shape + counts; signs webhooks with the same
 * HMAC secret the production client expects.
 */
export class FakePayPlusClient implements PayPlusClient {
  public webhookSecret = 'whsec_test_payplus';
  public readonly pages: Array<CreatePaymentPageInput & { paymentPageUid: string; paymentUrl: string }> = [];
  public readonly recurring: Array<CreateRecurringInput & { recurringId: string; token: string; paymentUrl: string }> = [];
  public readonly tokenCharges: Array<ChargeTokenInput & { transactionId: string }> = [];
  public readonly cancellations: string[] = [];
  public readonly refunds: Array<RefundInput & { refundId: string }> = [];

  // Tests can flip these to force the next call to fail.
  public nextChargeFails = false;
  public nextRefundFails = false;

  async createPaymentPage(input: CreatePaymentPageInput): Promise<CreatePaymentPageResult> {
    const paymentPageUid = `pp_page_${crypto.randomBytes(6).toString('hex')}`;
    const paymentUrl = `https://payplus.test/pay/${paymentPageUid}`;
    this.pages.push({ ...input, paymentPageUid, paymentUrl });
    return { paymentPageUid, paymentUrl };
  }

  async createRecurring(input: CreateRecurringInput): Promise<CreateRecurringResult> {
    const recurringId = `pp_rec_${crypto.randomBytes(6).toString('hex')}`;
    const token = `pp_tok_${crypto.randomBytes(6).toString('hex')}`;
    const paymentPageUid = `pp_recpage_${crypto.randomBytes(4).toString('hex')}`;
    const paymentUrl = `https://payplus.test/recur/${recurringId}`;
    this.recurring.push({ ...input, recurringId, token, paymentUrl });
    return {
      recurringId,
      token,
      paymentPageUid,
      paymentUrl,
      firstChargeStatus: 'pending',
    };
  }

  async chargeToken(input: ChargeTokenInput): Promise<ChargeTokenResult> {
    const transactionId = `pp_tok_tx_${crypto.randomBytes(6).toString('hex')}`;
    this.tokenCharges.push({ ...input, transactionId });
    if (this.nextChargeFails) {
      this.nextChargeFails = false;
      return { transactionId, status: 'failed' };
    }
    return { transactionId, status: 'succeeded' };
  }

  async cancelRecurring(input: { recurringId: string }): Promise<{ status: 'cancelled' }> {
    this.cancellations.push(input.recurringId);
    return { status: 'cancelled' };
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    const refundId = `pp_refund_${crypto.randomBytes(6).toString('hex')}`;
    this.refunds.push({ ...input, refundId });
    if (this.nextRefundFails) {
      this.nextRefundFails = false;
      return { refundId, status: 'failed' };
    }
    return { refundId, status: 'succeeded' };
  }

  verifyWebhookSignature(input: { rawBody: Buffer; signature: string }): boolean {
    const expected = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(input.rawBody)
      .digest('hex');
    return expected === input.signature;
  }

  async getTransaction(_input: { transactionId: string }): Promise<GetTransactionResult> {
    return {
      transactionId: _input.transactionId,
      status: 'succeeded',
      amountCents: 0,
      currency: 'ILS',
    };
  }
}

/** Compute the HMAC-SHA256 hex signature the same way PayPlusClient does. */
export function signPayPlusWebhook(secret: string, body: Buffer): string {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}
