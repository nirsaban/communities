import path from 'path';
import dotenv from 'dotenv';
import { z } from 'zod';

if (process.env.NODE_ENV !== 'test') {
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
}

const csv = (s: string): string[] =>
  s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4242),
  API_BASE_URL: z.string().default('http://localhost:4242'),
  WEB_BASE_URL: z.string().default('http://localhost:5174'),

  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),

  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be ≥16 chars'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be ≥16 chars'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),

  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().positive().default(30),
  EMAIL_VERIFICATION_TTL_MINUTES: z.coerce.number().int().positive().default(15),

  RATE_LIMIT_AUTH_MAX: z.coerce.number().int().positive().default(10),
  RATE_LIMIT_AUTH_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  RATE_LIMIT_READ_MAX: z.coerce.number().int().positive().default(200),
  RATE_LIMIT_WRITE_MAX: z.coerce.number().int().positive().default(60),

  CORS_ORIGINS: z.string().default('*'),

  MAIL_FROM: z.string().default('no-reply@example.com'),
  MAIL_DRIVER: z.enum(['console', 'sendgrid']).default('console'),

  STORAGE_DRIVER: z.enum(['local', 'cloudinary']).default('local'),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(524_288_000),

  // Cloudinary — only required when STORAGE_DRIVER=cloudinary. Picking the
  // driver without the keys throws at storage-init time (see storage.service.ts)
  // so misconfiguration fails fast instead of silently falling back to local.
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_UPLOAD_FOLDER: z.string().default('communities'),

  // Google OAuth (§1.3). All three must be present to enable the
  // /auth/google flow; if any is missing the controller short-circuits with
  // a clear "Google sign-in is not configured" error.
  GOOGLE_OAUTH_CLIENT_ID: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional(),
  GOOGLE_OAUTH_REDIRECT_URI: z.string().optional(),

  // PayPlus (Israeli gateway, platform-managed v1). API_KEY/SECRET_KEY/WEBHOOK_SECRET are
  // optional in dev to keep `npm run dev` working without creds — the PayPlusClient falls
  // back to a stdout-logging sandbox client when SANDBOX_MODE=true. In production they
  // are required (validated at startup via the cross-field refinement below).
  PAYPLUS_API_KEY: z.string().optional(),
  PAYPLUS_SECRET_KEY: z.string().optional(),
  PAYPLUS_PAGE_REQUEST_UID: z.string().optional(),
  PAYPLUS_WEBHOOK_SECRET: z.string().optional(),
  PAYPLUS_API_BASE_URL: z.string().default('https://restapi.payplus.co.il/api/v1.0'),
  PAYPLUS_SANDBOX_MODE: z
    .union([z.boolean(), z.string()])
    .transform((v) => (typeof v === 'boolean' ? v : v.toLowerCase() === 'true'))
    .default(true),

  PAYMENT_CURRENCY: z.string().default('ILS'),
  PAYMENT_MAX_INSTALLMENTS: z.coerce.number().int().min(1).max(12).default(12),

  PLATFORM_PAYMENT_NOTIFY_URL: z
    .string()
    .default('http://localhost:3000/api/v1/webhooks/payplus'),
  PLATFORM_PAYMENT_SUCCESS_URL: z
    .string()
    .default('http://localhost:3000/api/v1/payments/success'),
  PLATFORM_PAYMENT_FAILURE_URL: z
    .string()
    .default('http://localhost:3000/api/v1/payments/failure'),

  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug', 'silly']).default('info'),
}).superRefine((env, ctx) => {
  // In production, PayPlus credentials are mandatory — the sandbox fallback is dev-only.
  if (env.NODE_ENV === 'production' && !env.PAYPLUS_SANDBOX_MODE) {
    for (const key of ['PAYPLUS_API_KEY', 'PAYPLUS_SECRET_KEY', 'PAYPLUS_WEBHOOK_SECRET'] as const) {
      if (!env[key]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} is required in production unless PAYPLUS_SANDBOX_MODE=true`,
        });
      }
    }
  }
});

export type AppEnv = z.infer<typeof envSchema> & {
  corsOrigins: '*' | string[];
  isProd: boolean;
  isTest: boolean;
  isDev: boolean;
  appVersion: string;
};

function loadEnv(): AppEnv {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('\n  ');
    throw new Error(`Environment validation failed:\n  ${issues}`);
  }
  const env = parsed.data;
  return {
    ...env,
    corsOrigins: env.CORS_ORIGINS === '*' ? '*' : csv(env.CORS_ORIGINS),
    isProd: env.NODE_ENV === 'production',
    isTest: env.NODE_ENV === 'test',
    isDev: env.NODE_ENV === 'development',
    appVersion: process.env.npm_package_version || '0.1.0',
  };
}

export const env = loadEnv();
export default env;
