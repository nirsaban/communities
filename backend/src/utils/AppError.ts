// Standard error codes from PRD 13 §3.
export type ErrorCode =
  | 'UNAUTHENTICATED'
  | 'UNAUTHORIZED'
  | 'INVALID_INPUT'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'PAYMENT_REQUIRED'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export const ERROR_STATUS: Record<ErrorCode, number> = {
  UNAUTHENTICATED: 401,
  UNAUTHORIZED: 403,
  INVALID_INPUT: 400,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PAYMENT_REQUIRED: 402,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

export interface AppErrorOptions {
  status?: number;
  details?: unknown;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly status: number;
  public readonly details?: unknown;
  public readonly expose = true;

  constructor(code: ErrorCode, message: string, opts: AppErrorOptions = {}) {
    super(message);
    this.code = code;
    this.status = opts.status ?? ERROR_STATUS[code] ?? 500;
    this.details = opts.details;
  }

  static unauthenticated(message = 'Authentication required', details?: unknown): AppError {
    return new AppError('UNAUTHENTICATED', message, { details });
  }
  static unauthorized(message = 'Forbidden', details?: unknown): AppError {
    return new AppError('UNAUTHORIZED', message, { details });
  }
  static invalidInput(message = 'Invalid input', details?: unknown): AppError {
    return new AppError('INVALID_INPUT', message, { details });
  }
  static notFound(message = 'Resource not found', details?: unknown): AppError {
    return new AppError('NOT_FOUND', message, { details });
  }
  static conflict(message = 'Conflict', details?: unknown): AppError {
    return new AppError('CONFLICT', message, { details });
  }
  static paymentRequired(message = 'Payment required', details?: unknown): AppError {
    return new AppError('PAYMENT_REQUIRED', message, { details });
  }
  static rateLimited(message = 'Too many requests', details?: unknown): AppError {
    return new AppError('RATE_LIMITED', message, { details });
  }
  static internal(message = 'Internal server error', details?: unknown): AppError {
    return new AppError('INTERNAL_ERROR', message, { details });
  }
}
