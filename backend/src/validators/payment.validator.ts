import { z } from 'zod';

const objectIdLike = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

export const subscribeSchema = z.object({
  plan: z.enum(['monthly', 'annual']).default('monthly'),
});

export const refundSchema = z
  .object({
    // Omit to issue a full refund.
    amountCents: z.number().int().positive().optional(),
    reason: z.enum(['requested_by_customer', 'duplicate', 'fraudulent']).optional(),
  })
  .strict();

export const listPaymentsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
  cursor: z.string().optional(),
  status: z
    .enum(['pending', 'succeeded', 'failed', 'refunded', 'partial_refund'])
    .optional(),
});

export const pidParamSchema = z.object({ pid: objectIdLike });
export const sidParamSchema = z.object({ sid: objectIdLike });

export type SubscribeInput = z.infer<typeof subscribeSchema>;
export type RefundInputBody = z.infer<typeof refundSchema>;
