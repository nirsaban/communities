import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { AppError } from '../utils/AppError';
import logger from '../config/logger';

export function notFound(_req: Request, _res: Response, next: NextFunction): void {
  next(AppError.notFound('Route not found'));
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  let appErr: AppError;
  if (err instanceof AppError) {
    appErr = err;
  } else if (err instanceof ZodError) {
    appErr = AppError.invalidInput(
      'Validation failed',
      err.issues.map((i) => ({ field: i.path.join('.'), issue: i.code, message: i.message })),
    );
  } else if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => ({
      field: e.path,
      issue: e.kind,
      message: e.message,
    }));
    appErr = AppError.invalidInput('Validation failed', details);
  } else if (err instanceof mongoose.Error.CastError) {
    appErr = AppError.invalidInput(`Invalid ${err.path}`);
  } else if (
    err &&
    typeof err === 'object' &&
    'code' in err &&
    (err as { code?: number }).code === 11000
  ) {
    appErr = AppError.conflict('Duplicate value', (err as { keyValue?: unknown }).keyValue);
  } else {
    appErr = AppError.internal();
  }

  if (appErr.status >= 500) {
    logger.error({
      msg: 'request.error',
      method: req.method,
      path: req.originalUrl,
      userId: req.user?._id ? String(req.user._id) : undefined,
      err: err instanceof Error ? { message: err.message, stack: err.stack } : err,
    });
  } else {
    logger.warn({
      msg: 'request.error',
      method: req.method,
      path: req.originalUrl,
      userId: req.user?._id ? String(req.user._id) : undefined,
      code: appErr.code,
      message: appErr.message,
    });
  }

  res.status(appErr.status).json({
    error: {
      code: appErr.code,
      message: appErr.message,
      ...(appErr.details !== undefined ? { details: appErr.details } : {}),
    },
  });
}
