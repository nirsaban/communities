import { z } from 'zod';

// PRD 02 §2.4: ≥8 chars, at least 1 letter and 1 number.
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .refine((p) => /[A-Za-z]/.test(p), 'Password must contain a letter')
  .refine((p) => /\d/.test(p), 'Password must contain a number');

const emailSchema = z.string().email('Invalid email').max(254);

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(1).max(120).optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(10).optional(),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20),
  newPassword: passwordSchema,
});

export const verifyEmailSchema = z.object({
  email: emailSchema,
  code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits'),
});

export const resendVerificationSchema = z.object({
  email: emailSchema,
});

const socialsSchema = z
  .object({
    instagram: z.string().max(120).optional(),
    x: z.string().max(120).optional(),
    linkedin: z.string().max(200).optional(),
    facebook: z.string().max(200).optional(),
    tiktok: z.string().max(120).optional(),
    website: z.string().max(200).optional(),
  })
  .partial();

const profileSchema = z
  .object({
    jobTitle: z.string().max(100).optional(),
    profession: z.string().max(100).optional(),
    company: z.string().max(120).optional(),
    livingLocation: z.string().max(120).optional(),
    relationshipStatus: z
      .enum(['single', 'in_relationship', 'married', 'other'])
      .optional(),
    socials: socialsSchema.optional(),
  })
  .partial();

export const updateMeSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    bio: z.string().max(1000).optional(),
    photoUrl: z.string().url().optional(),
    interests: z.array(z.string().max(40)).max(50).optional(),
    profile: profileSchema.optional(),
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdateMeInput = z.infer<typeof updateMeSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
