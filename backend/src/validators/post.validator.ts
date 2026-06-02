import { z } from 'zod';

const objectIdLike = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

export const createPostSchema = z.object({
  type: z.enum(['announcement', 'discussion', 'update']).default('discussion'),
  title: z.string().max(200).optional(),
  body: z.string().min(1).max(10_000),
  imageUrls: z.array(z.string().url()).max(10).default([]),
});

export const updatePostSchema = z
  .object({
    title: z.string().max(200).optional(),
    body: z.string().min(1).max(10_000).optional(),
    imageUrls: z.array(z.string().url()).max(10).optional(),
    isLocked: z.boolean().optional(),
  })
  .strict();

export const listPostsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
  cursor: z.string().optional(),
  type: z.enum(['announcement', 'discussion', 'update']).optional(),
});

export const createPostCommentSchema = z.object({
  body: z.string().min(1).max(5000),
  replyToId: objectIdLike.optional(),
});

export const pidParamSchema = z.object({ pid: objectIdLike });

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type CreatePostCommentInput = z.infer<typeof createPostCommentSchema>;
