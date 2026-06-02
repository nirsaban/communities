import crypto from 'crypto';
import axios, { AxiosInstance, AxiosError } from 'axios';
import env from '../../config/env';
import logger from '../../config/logger';
import { AppError } from '../../utils/AppError';

/**
 * Wraps the PayPlus REST API (https://docs.payplus.co.il/reference/introduction).
 *
 * v1 is platform-managed — a single merchant account, ILS, hosted payment pages
 * (SAQ-A PCI scope). No multi-currency, no Connect-style sub-accounts.
 *
 * In sandbox mode (PAYPLUS_SANDBOX_MODE=true, the default in dev/test), all
 * outbound calls are intercepted by `PayPlusSandboxClient` instead of hitting
 * the network — see docs/DECISIONS.md for the rationale.
 *
 * Auth header format (per PayPlus docs):  Authorization: <PAYPLUS_API_KEY>.<PAYPLUS_SECRET_KEY>
 *
 * Amounts are always in agorot (Israeli cents).
 */

export class PaymentGatewayError extends AppError {
  public readonly gateway = 'payplus' as const;
  public readonly httpStatus?: number;
  public readonly response?: unknown;

  constructor(message: string, opts: { httpStatus?: number; response?: unknown } = {}) {
    super('INTERNAL_ERROR', `PayPlus: ${message}`, { status: 502 });
    this.httpStatus = opts.httpStatus;
    this.response = opts.response;
  }
}

export interface PaymentMetadata {
  paymentId?: string;
  subscriptionId?: string;
  communityId: string;
  userId: string;
  eventId?: string;
  kind: 'event' | 'subscription' | 'token_charge';
}

export interface CreatePaymentPageInput {
  amountCents: number;
  currency: string;
  description: string;
  maxInstallments?: number;
  successUrl: string;
  failureUrl: string;
  notifyUrl: string;
  metadata: PaymentMetadata;
  customerEmail?: string;
}

export interface CreatePaymentPageResult {
  paymentPageUid: string;
  paymentUrl: string;
}

export interface CreateRecurringInput {
  amountCents: number;
  currency: string;
  description: string;
  intervalMonths: number;
  startDate: Date;
  notifyUrl: string;
  metadata: PaymentMetadata;
  successUrl: string;
  failureUrl: string;
  customerEmail?: string;
}

export interface CreateRecurringResult {
  // PayPlus returns a recurring program identifier; we store it as gatewaySubscriptionId.
  recurringId: string;
  // Card token saved for retries; never echoed back to the client.
  token: string;
  // Hosted-page URL the user must complete (collects card details on a SAQ-A page).
  paymentUrl: string;
  paymentPageUid: string;
  firstChargeStatus: 'pending' | 'succeeded' | 'failed';
}

export interface ChargeTokenInput {
  token: string;
  amountCents: number;
  currency: string;
  description: string;
  metadata: PaymentMetadata;
}

export interface ChargeTokenResult {
  transactionId: string;
  status: 'succeeded' | 'failed';
  message?: string;
}

export interface RefundInput {
  transactionId: string;
  amountCents: number;
  reason?: string;
}

export interface RefundResult {
  refundId: string;
  status: 'succeeded' | 'failed';
}

export interface GetTransactionResult {
  transactionId: string;
  status: 'succeeded' | 'failed' | 'pending' | 'refunded';
  amountCents: number;
  currency: string;
  metadata?: PaymentMetadata;
}

export interface PayPlusClient {
  createPaymentPage(input: CreatePaymentPageInput): Promise<CreatePaymentPageResult>;
  createRecurring(input: CreateRecurringInput): Promise<CreateRecurringResult>;
  chargeToken(input: ChargeTokenInput): Promise<ChargeTokenResult>;
  cancelRecurring(input: { recurringId: string }): Promise<{ status: 'cancelled' }>;
  refund(input: RefundInput): Promise<RefundResult>;
  verifyWebhookSignature(input: { rawBody: Buffer; signature: string }): boolean;
  getTransaction(input: { transactionId: string }): Promise<GetTransactionResult>;
}

// ---------------------------------------------------------------------------
// Real (network) client
// ---------------------------------------------------------------------------

class PayPlusRestClient implements PayPlusClient {
  private readonly http: AxiosInstance;
  private readonly webhookSecret: string;

  constructor(apiKey: string, secretKey: string, webhookSecret: string, baseUrl: string) {
    this.webhookSecret = webhookSecret;
    this.http = axios.create({
      baseURL: baseUrl,
      timeout: 15_000,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `${apiKey}.${secretKey}`,
      },
    });
  }

  private wrap(name: string, err: unknown): never {
    if (err instanceof PaymentGatewayError) throw err;
    if (err && (err as AxiosError).isAxiosError) {
      const ae = err as AxiosError<{ message?: string }>;
      throw new PaymentGatewayError(
        `${name} failed: ${ae.response?.data?.message ?? ae.message}`,
        { httpStatus: ae.response?.status, response: ae.response?.data },
      );
    }
    throw new PaymentGatewayError(
      `${name} failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  async createPaymentPage(input: CreatePaymentPageInput): Promise<CreatePaymentPageResult> {
    try {
      const res = await this.http.post('/PaymentPages/generateLink', {
        payment_page_uid: env.PAYPLUS_PAGE_REQUEST_UID,
        amount: input.amountCents / 100, // PayPlus expects shekels with decimals
        currency_code: input.currency,
        sendEmailApproval: false,
        sendEmailFailure: false,
        refURL_success: input.successUrl,
        refURL_failure: input.failureUrl,
        refURL_callback: input.notifyUrl,
        more_info: JSON.stringify(input.metadata),
        more_info_1: input.metadata.paymentId ?? '',
        max_payments: input.maxInstallments ?? 1,
        items: [{ name: input.description, quantity: 1, price: input.amountCents / 100 }],
        customer: input.customerEmail ? { email: input.customerEmail } : undefined,
      });
      const data = res.data?.data ?? res.data;
      const paymentPageUid =
        (data?.payment_page_uid as string | undefined) ??
        (data?.payment_page_request_uid as string | undefined);
      const paymentUrl = data?.payment_page_link as string | undefined;
      if (!paymentPageUid || !paymentUrl) {
        throw new PaymentGatewayError('createPaymentPage missing payment_page_uid/link', {
          response: data,
        });
      }
      return { paymentPageUid, paymentUrl };
    } catch (err) {
      this.wrap('createPaymentPage', err);
    }
  }

  async createRecurring(input: CreateRecurringInput): Promise<CreateRecurringResult> {
    try {
      const res = await this.http.post('/PaymentPages/generateLink', {
        payment_page_uid: env.PAYPLUS_PAGE_REQUEST_UID,
        amount: input.amountCents / 100,
        currency_code: input.currency,
        refURL_success: input.successUrl,
        refURL_failure: input.failureUrl,
        refURL_callback: input.notifyUrl,
        more_info: JSON.stringify(input.metadata),
        more_info_1: input.metadata.subscriptionId ?? '',
        create_token: true,
        charge_method: 'recurring',
        recurring: {
          frequency: 'monthly',
          interval: input.intervalMonths,
          start_date: input.startDate.toISOString().slice(0, 10),
        },
        items: [{ name: input.description, quantity: 1, price: input.amountCents / 100 }],
        customer: input.customerEmail ? { email: input.customerEmail } : undefined,
      });
      const data = res.data?.data ?? res.data;
      const paymentPageUid = data?.payment_page_uid as string | undefined;
      const paymentUrl = data?.payment_page_link as string | undefined;
      const recurringId = (data?.recurring_id ?? data?.recurring_request_uid) as
        | string
        | undefined;
      const token = (data?.token ?? data?.recurring_token) as string | undefined;
      if (!paymentPageUid || !paymentUrl || !recurringId) {
        throw new PaymentGatewayError('createRecurring missing required fields', {
          response: data,
        });
      }
      return {
        recurringId,
        token: token ?? '',
        paymentUrl,
        paymentPageUid,
        firstChargeStatus: 'pending',
      };
    } catch (err) {
      this.wrap('createRecurring', err);
    }
  }

  async chargeToken(input: ChargeTokenInput): Promise<ChargeTokenResult> {
    try {
      const res = await this.http.post('/Transactions/TokenCharge', {
        token: input.token,
        amount: input.amountCents / 100,
        currency_code: input.currency,
        more_info: JSON.stringify(input.metadata),
        items: [{ name: input.description, quantity: 1, price: input.amountCents / 100 }],
      });
      const data = res.data?.data ?? res.data;
      const transactionId = (data?.transaction_uid ?? data?.transaction_id) as string | undefined;
      const status = data?.status_code === '000' || data?.status === 'approved' ? 'succeeded' : 'failed';
      if (!transactionId) {
        throw new PaymentGatewayError('chargeToken missing transactionId', { response: data });
      }
      return { transactionId, status, message: data?.message };
    } catch (err) {
      this.wrap('chargeToken', err);
    }
  }

  async cancelRecurring(input: { recurringId: string }): Promise<{ status: 'cancelled' }> {
    try {
      await this.http.post(`/Recurring/cancel`, { recurring_uid: input.recurringId });
      return { status: 'cancelled' };
    } catch (err) {
      this.wrap('cancelRecurring', err);
    }
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    try {
      const res = await this.http.post('/Transactions/refund', {
        related_transaction: input.transactionId,
        amount: input.amountCents / 100,
        more_info: input.reason ?? 'refund',
      });
      const data = res.data?.data ?? res.data;
      const refundId = (data?.refund_uid ?? data?.transaction_uid) as string | undefined;
      const status = data?.status_code === '000' || data?.status === 'approved' ? 'succeeded' : 'failed';
      if (!refundId) {
        throw new PaymentGatewayError('refund missing refundId', { response: data });
      }
      return { refundId, status };
    } catch (err) {
      this.wrap('refund', err);
    }
  }

  verifyWebhookSignature(input: { rawBody: Buffer; signature: string }): boolean {
    return verifyHmacSignature(this.webhookSecret, input.rawBody, input.signature);
  }

  async getTransaction(input: { transactionId: string }): Promise<GetTransactionResult> {
    try {
      const res = await this.http.get(`/Transactions/${encodeURIComponent(input.transactionId)}`);
      const data = res.data?.data ?? res.data;
      const status: GetTransactionResult['status'] =
        data?.status === 'approved' || data?.status_code === '000'
          ? 'succeeded'
          : data?.status === 'refunded'
            ? 'refunded'
            : data?.status === 'pending'
              ? 'pending'
              : 'failed';
      const amountCents = Math.round(Number(data?.amount ?? 0) * 100);
      const currency = String(data?.currency_code ?? env.PAYMENT_CURRENCY);
      let metadata: PaymentMetadata | undefined;
      if (data?.more_info) {
        try {
          metadata = JSON.parse(String(data.more_info)) as PaymentMetadata;
        } catch {
          metadata = undefined;
        }
      }
      return { transactionId: input.transactionId, status, amountCents, currency, metadata };
    } catch (err) {
      this.wrap('getTransaction', err);
    }
  }
}

// ---------------------------------------------------------------------------
// Sandbox client — implements the same interface but logs every call instead
// of touching the network. Used when PAYPLUS_SANDBOX_MODE=true OR when API
// credentials are missing in dev/test. Documented in docs/DECISIONS.md.
// ---------------------------------------------------------------------------

class PayPlusSandboxClient implements PayPlusClient {
  private readonly webhookSecret: string;
  private readonly txCounter = { n: 0 };

  constructor(webhookSecret: string) {
    this.webhookSecret = webhookSecret;
  }

  private nextId(prefix: string): string {
    this.txCounter.n += 1;
    return `${prefix}_${Date.now()}_${this.txCounter.n}_${crypto.randomBytes(4).toString('hex')}`;
  }

  async createPaymentPage(input: CreatePaymentPageInput): Promise<CreatePaymentPageResult> {
    const paymentPageUid = this.nextId('pp_page');
    const paymentUrl = `${input.successUrl}?ref=${input.metadata.paymentId ?? ''}&pageUid=${paymentPageUid}`;
    logger.info({
      msg: '[PAYPLUS-SANDBOX] createPaymentPage',
      amountCents: input.amountCents,
      currency: input.currency,
      maxInstallments: input.maxInstallments,
      paymentPageUid,
      metadata: input.metadata,
    });
    return { paymentPageUid, paymentUrl };
  }

  async createRecurring(input: CreateRecurringInput): Promise<CreateRecurringResult> {
    const paymentPageUid = this.nextId('pp_recpage');
    const recurringId = this.nextId('pp_rec');
    const token = this.nextId('pp_tok');
    const paymentUrl = `${input.successUrl}?ref=${input.metadata.subscriptionId ?? ''}&recurringId=${recurringId}`;
    logger.info({
      msg: '[PAYPLUS-SANDBOX] createRecurring',
      amountCents: input.amountCents,
      currency: input.currency,
      intervalMonths: input.intervalMonths,
      recurringId,
      metadata: input.metadata,
    });
    return {
      recurringId,
      token,
      paymentUrl,
      paymentPageUid,
      firstChargeStatus: 'pending',
    };
  }

  async chargeToken(input: ChargeTokenInput): Promise<ChargeTokenResult> {
    const transactionId = this.nextId('pp_tok_tx');
    logger.info({
      msg: '[PAYPLUS-SANDBOX] chargeToken',
      transactionId,
      amountCents: input.amountCents,
      tokenPreview: `${input.token.slice(0, 8)}...`,
    });
    return { transactionId, status: 'succeeded' };
  }

  async cancelRecurring(input: { recurringId: string }): Promise<{ status: 'cancelled' }> {
    logger.info({ msg: '[PAYPLUS-SANDBOX] cancelRecurring', recurringId: input.recurringId });
    return { status: 'cancelled' };
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    const refundId = this.nextId('pp_refund');
    logger.info({
      msg: '[PAYPLUS-SANDBOX] refund',
      transactionId: input.transactionId,
      amountCents: input.amountCents,
      refundId,
      reason: input.reason,
    });
    return { refundId, status: 'succeeded' };
  }

  verifyWebhookSignature(input: { rawBody: Buffer; signature: string }): boolean {
    return verifyHmacSignature(this.webhookSecret, input.rawBody, input.signature);
  }

  async getTransaction(input: { transactionId: string }): Promise<GetTransactionResult> {
    logger.info({ msg: '[PAYPLUS-SANDBOX] getTransaction', transactionId: input.transactionId });
    return {
      transactionId: input.transactionId,
      status: 'succeeded',
      amountCents: 0,
      currency: env.PAYMENT_CURRENCY,
    };
  }
}

// ---------------------------------------------------------------------------
// Module-level cached singleton + test seam.
// ---------------------------------------------------------------------------

let instance: PayPlusClient | null = null;

export function getPayPlusClient(): PayPlusClient {
  if (instance) return instance;
  const useSandbox =
    env.PAYPLUS_SANDBOX_MODE ||
    !env.PAYPLUS_API_KEY ||
    !env.PAYPLUS_SECRET_KEY;
  if (useSandbox) {
    if (env.NODE_ENV === 'production' && !env.PAYPLUS_SANDBOX_MODE) {
      throw new PaymentGatewayError(
        'PAYPLUS_API_KEY/SECRET_KEY missing in production (set PAYPLUS_SANDBOX_MODE=true only for staging)',
      );
    }
    if (!env.isTest) {
      // eslint-disable-next-line no-console
      console.warn(
        '[PayPlusClient] Using PayPlusSandboxClient — outbound calls logged to stdout, not sent to PayPlus.',
      );
    }
    instance = new PayPlusSandboxClient(env.PAYPLUS_WEBHOOK_SECRET ?? 'sandbox-webhook-secret');
    return instance;
  }
  instance = new PayPlusRestClient(
    env.PAYPLUS_API_KEY!,
    env.PAYPLUS_SECRET_KEY!,
    env.PAYPLUS_WEBHOOK_SECRET ?? '',
    env.PAYPLUS_API_BASE_URL,
  );
  return instance;
}

/** Test-only seam: swap the cached client (pass null to reset). */
export function _resetPayPlusClient(svc: PayPlusClient | null): void {
  instance = svc;
}

// ---------------------------------------------------------------------------
// HMAC verifier (exported separately so the webhook handler can call it without
// instantiating the full client).
// ---------------------------------------------------------------------------

export function verifyHmacSignature(secret: string, rawBody: Buffer, signature: string): boolean {
  if (!secret || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  // timingSafeEqual requires equal-length buffers; guard first.
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
