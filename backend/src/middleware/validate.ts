import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodError, ZodSchema } from 'zod';
import { AppError } from '../utils/AppError';

export type ValidationTarget = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, target: ValidationTarget = 'body'): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const data = schema.parse(req[target]);
      // Mutate the request with the parsed/typed value.
      (req as unknown as Record<string, unknown>)[target] = data;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.issues.map((i) => ({
          field: i.path.join('.'),
          issue: i.code,
          message: i.message,
        }));
        next(AppError.invalidInput('Validation failed', details));
        return;
      }
      next(err);
    }
  };
}
