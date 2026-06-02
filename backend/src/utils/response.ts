import type { Response } from 'express';

export function ok<T>(res: Response, data: T, meta?: Record<string, unknown>): Response {
  return meta ? res.json({ data, meta }) : res.json({ data });
}

export function created<T>(res: Response, data: T, meta?: Record<string, unknown>): Response {
  return meta ? res.status(201).json({ data, meta }) : res.status(201).json({ data });
}

export function noContent(res: Response): Response {
  return res.status(204).send();
}
