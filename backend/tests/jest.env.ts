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
// PayPlus (test placeholders so env validation passes; tests swap PayPlusClient).
process.env.PAYPLUS_API_KEY = process.env.PAYPLUS_API_KEY || 'pp_test_api_key';
process.env.PAYPLUS_SECRET_KEY = process.env.PAYPLUS_SECRET_KEY || 'pp_test_secret_key';
process.env.PAYPLUS_PAGE_REQUEST_UID =
  process.env.PAYPLUS_PAGE_REQUEST_UID || 'pp_test_page_uid';
process.env.PAYPLUS_WEBHOOK_SECRET =
  process.env.PAYPLUS_WEBHOOK_SECRET || 'pp_test_webhook_secret';
process.env.PAYPLUS_SANDBOX_MODE = process.env.PAYPLUS_SANDBOX_MODE || 'true';
process.env.PAYMENT_CURRENCY = process.env.PAYMENT_CURRENCY || 'ILS';
process.env.PLATFORM_PAYMENT_NOTIFY_URL =
  process.env.PLATFORM_PAYMENT_NOTIFY_URL || 'http://localhost:3000/api/v1/webhooks/payplus';
process.env.PLATFORM_PAYMENT_SUCCESS_URL =
  process.env.PLATFORM_PAYMENT_SUCCESS_URL || 'http://localhost:3000/api/v1/payments/success';
process.env.PLATFORM_PAYMENT_FAILURE_URL =
  process.env.PLATFORM_PAYMENT_FAILURE_URL || 'http://localhost:3000/api/v1/payments/failure';
// Will be overridden by globalSetup to the in-memory server URI.
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/test-bootstrap';
