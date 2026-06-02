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

export const updateMeSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    bio: z.string().max(1000).optional(),
    photoUrl: z.string().url().optional(),
    interests: z.array(z.string().max(40)).max(50).optional(),
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdateMeInput = z.infer<typeof updateMeSchema>;
