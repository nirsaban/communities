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
  PORT: z.coerce.number().int().positive().default(3000),
  API_BASE_URL: z.string().default('http://localhost:3000'),

  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),

  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be ≥16 chars'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be ≥16 chars'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),

  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().positive().default(30),

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

  // Stripe (test mode in dev). Optional so existing P0–P3 tests keep working without keys.
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_API_VERSION: z.string().default('2025-09-30.clover'),
  STRIPE_PLATFORM_FEE_BPS: z.coerce.number().int().min(0).max(10_000).default(500),
  STRIPE_SUBSCRIPTION_MONTHLY_PRICE_ID: z.string().optional(),
  STRIPE_SUBSCRIPTION_ANNUAL_PRICE_ID: z.string().optional(),
  CHECKOUT_SUCCESS_URL: z
    .string()
    .default('http://localhost:3000/payments/success?session_id={CHECKOUT_SESSION_ID}'),
  CHECKOUT_CANCEL_URL: z.string().default('http://localhost:3000/payments/cancel'),

  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug', 'silly']).default('info'),
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
