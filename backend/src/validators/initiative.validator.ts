import { z } from 'zod';

const objectIdLike = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

export const createInitiativeSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(5000).optional().default(''),
  category: z.enum(['event', 'volunteer', 'product', 'social', 'other']).default('other'),
  coverImageUrl: z.string().url().optional(),
  targetDate: z.coerce.date().optional(),
});

export const updateInitiativeSchema = z
  .object({
    title: z.string().min(2).max(200).optional(),
    description: z.string().max(5000).optional(),
    category: z.enum(['event', 'volunteer', 'product', 'social', 'other']).optional(),
    coverImageUrl: z.string().url().optional(),
    targetDate: z.coerce.date().nullable().optional(),
  })
  .strict();

export const rejectInitiativeSchema = z.object({
  reason: z.string().max(1000).optional(),
});

export const addContributorSchema = z.object({
  userId: objectIdLike,
});

export const completeInitiativeSchema = z.object({
  summary: z.string().max(5000).optional(),
});

export const createCommentSchema = z.object({
  body: z.string().min(1).max(5000),
  replyToId: objectIdLike.optional(),
});

export const listInitiativesQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
  cursor: z.string().optional(),
  status: z
    .enum(['draft', 'submitted', 'under_review', 'approved', 'active', 'completed', 'rejected'])
    .optional(),
  category: z.enum(['event', 'volunteer', 'product', 'social', 'other']).optional(),
  filter: z.enum(['mine', 'supporting', 'all']).optional(),
});

export const iidParamSchema = z.object({ iid: objectIdLike });
export const iidUidParamSchema = z.object({ iid: objectIdLike, uid: objectIdLike });

export type CreateInitiativeInput = z.infer<typeof createInitiativeSchema>;
export type UpdateInitiativeInput = z.infer<typeof updateInitiativeSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
