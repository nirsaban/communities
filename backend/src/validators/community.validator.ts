import { z } from 'zod';

const objectIdLike = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

export const createCommunitySchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(2000).optional().default(''),
  category: z
    .enum(['religious', 'educational', 'professional', 'hobby', 'other'])
    .default('other'),
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with dashes')
    .optional(),
  privacy: z.enum(['public', 'invite_only', 'application']).default('invite_only'),
  initialAdminEmail: z.string().email(),
});

export const updateCommunitySchema = z
  .object({
    name: z.string().min(2).max(120).optional(),
    description: z.string().max(2000).optional(),
    category: z
      .enum(['religious', 'educational', 'professional', 'hobby', 'other'])
      .optional(),
    privacy: z.enum(['public', 'invite_only', 'application']).optional(),
    logoUrl: z.string().url().optional(),
    coverUrl: z.string().url().optional(),
    settings: z
      .object({
        branding: z
          .object({
            primaryColor: z.string().optional(),
            accentColor: z.string().optional(),
          })
          .optional(),
        welcomeMessage: z.string().max(2000).optional(),
        rules: z.string().max(10000).optional(),
      })
      .optional(),
  })
  .strict();

export const onboardCommunitySchema = z
  .object({
    name: z.string().min(2).max(120).optional(),
    description: z.string().max(2000).optional(),
    category: z
      .enum(['religious', 'educational', 'professional', 'hobby', 'other'])
      .optional(),
    privacy: z.enum(['public', 'invite_only', 'application']).optional(),
    logoUrl: z.string().url().optional(),
    coverUrl: z.string().url().optional(),
    welcomeMessage: z.string().max(2000).optional(),
    completedStep: z
      .enum(['basics', 'branding', 'privacy', 'experience', 'firstEvent', 'firstInvites'])
      .optional(),
  })
  .strict();

// Wire-format role accepts both camelCase ('eventManager') and snake_case
// ('event_manager') for backwards-compat with any existing clients, but
// outputs the DB enum after transform.
const wireRoleEnum = z
  .enum(['member', 'eventManager', 'event_manager', 'subadmin', 'admin'])
  .transform((v) => (v === 'eventManager' ? 'event_manager' : v));

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: wireRoleEnum.default('member'),
});

export const changeMemberRoleSchema = z.object({
  role: wireRoleEnum,
});

export const listQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
  cursor: z.string().optional(),
  search: z.string().max(200).optional(),
  status: z.enum(['active', 'suspended', 'deleted']).optional(),
  role: wireRoleEnum.optional(),
});

export const acceptInvitationSchema = z.object({
  // If the user is already authenticated, no body fields are required.
  // For new users, allow inline signup.
  password: z
    .string()
    .min(8)
    .refine((p) => /[A-Za-z]/.test(p), 'Password must contain a letter')
    .refine((p) => /\d/.test(p), 'Password must contain a number')
    .optional(),
  name: z.string().min(1).max(120).optional(),
});

export const cidParamSchema = z.object({
  cid: objectIdLike,
});

export const uidParamSchema = z.object({
  uid: objectIdLike,
});

export const cidUidParamSchema = z.object({
  cid: objectIdLike,
  uid: objectIdLike,
});

export const invitationTokenParamSchema = z.object({
  token: z.string().min(10).max(200),
});

export type CreateCommunityInput = z.infer<typeof createCommunitySchema>;
export type UpdateCommunityInput = z.infer<typeof updateCommunitySchema>;
export type OnboardCommunityInput = z.infer<typeof onboardCommunitySchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type ChangeMemberRoleInput = z.infer<typeof changeMemberRoleSchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
