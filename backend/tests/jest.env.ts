process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET || 'test-access-secret-must-be-long-enough';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-must-be-long-enough';
process.env.JWT_ACCESS_TTL = process.env.JWT_ACCESS_TTL || '15m';
process.env.JWT_REFRESH_TTL = process.env.JWT_REFRESH_TTL || '30d';
process.env.MAIL_DRIVER = 'console';
process.env.STORAGE_DRIVER = 'local';
process.env.UPLOAD_DIR = process.env.UPLOAD_DIR || './tests/.uploads';
process.env.API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
// Stripe (test mode placeholders so env validation passes; tests swap StripeService).
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_dummy_for_unit_tests';
process.env.STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_secret_value';
process.env.STRIPE_SUBSCRIPTION_MONTHLY_PRICE_ID =
  process.env.STRIPE_SUBSCRIPTION_MONTHLY_PRICE_ID || 'price_test_monthly';
process.env.STRIPE_SUBSCRIPTION_ANNUAL_PRICE_ID =
  process.env.STRIPE_SUBSCRIPTION_ANNUAL_PRICE_ID || 'price_test_annual';
// Will be overridden by globalSetup to the in-memory server URI.
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/test-bootstrap';
