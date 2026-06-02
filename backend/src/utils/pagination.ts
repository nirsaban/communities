import type { Types } from 'mongoose';
import { AppError } from './AppError';

// Cursor encodes the last document's {createdAt, _id} as base64 JSON.
// Stable ordering: createdAt DESC, _id DESC as tiebreaker.

export interface Cursor {
  createdAt: Date;
  _id: string;
}

export interface PaginationParams {
  limit: number;
  cursor: Cursor | null;
}

export function encodeCursor(doc: { createdAt: Date; _id: Types.ObjectId | string }): string {
  return Buffer.from(
    JSON.stringify({ c: new Date(doc.createdAt).toISOString(), i: String(doc._id) }),
  ).toString('base64url');
}

export function decodeCursor(cursor: string): Cursor {
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    const obj = JSON.parse(raw) as { c?: string; i?: string };
    if (!obj.c || !obj.i) throw new Error('bad cursor');
    return { createdAt: new Date(obj.c), _id: obj.i };
  } catch {
    throw AppError.invalidInput('Invalid pagination cursor');
  }
}

export function parsePagination(
  query: Record<string, unknown>,
  { defaultLimit = 20, maxLimit = 100 }: { defaultLimit?: number; maxLimit?: number } = {},
): PaginationParams {
  let rawLimit: number;
  if (typeof query.limit === 'number' && Number.isFinite(query.limit)) {
    rawLimit = query.limit;
  } else if (typeof query.limit === 'string') {
    const n = parseInt(query.limit, 10);
    rawLimit = Number.isFinite(n) ? n : defaultLimit;
  } else {
    rawLimit = defaultLimit;
  }
  const limit = Math.min(Math.max(rawLimit, 1), maxLimit);
  const cursor = typeof query.cursor === 'string' ? decodeCursor(query.cursor) : null;
  return { limit, cursor };
}

// Build a Mongoose filter that pages forward by (createdAt DESC, _id DESC).
export function cursorFilter(cursor: Cursor | null): Record<string, unknown> {
  if (!cursor) return {};
  return {
    $or: [
      { createdAt: { $lt: cursor.createdAt } },
      { createdAt: cursor.createdAt, _id: { $lt: cursor._id } },
    ],
  };
}

export function nextCursorFor(items: Array<{ createdAt: Date; _id: Types.ObjectId | string }>):
  | string
  | null {
  if (!items.length) return null;
  const last = items[items.length - 1];
  return encodeCursor(last);
}
