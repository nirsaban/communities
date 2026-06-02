import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import asyncHandler from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { ok } from '../utils/response';
import { Notification } from '../models/Notification';
import {
  NOTIFICATION_PREF_KEYS,
  NotificationPrefKey,
  INotificationPreferences,
  defaultNotificationPreferences,
} from '../models/User';
import { cursorFilter, nextCursorFor, parsePagination } from '../utils/pagination';

export const list = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  const { limit, cursor } = parsePagination({
    limit: req.query.limit as string | number | undefined,
    cursor: req.query.cursor as string | undefined,
  });
  const filter: Record<string, unknown> = { userId: req.user._id };
  if (req.query.unread === 'true') filter.readAt = { $exists: false };
  Object.assign(filter, cursorFilter(cursor));
  const rows = await Notification.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1);
  const items = rows.slice(0, limit);
  const next =
    rows.length > limit
      ? nextCursorFor(items as unknown as { createdAt: Date; _id: mongoose.Types.ObjectId }[])
      : null;
  ok(
    res,
    items.map((n) => ({
      id: String(n._id),
      type: n.type,
      title: n.title,
      body: n.body,
      payload: n.payload,
      communityId: n.communityId ? String(n.communityId) : null,
      readAt: n.readAt,
      createdAt: n.createdAt,
    })),
    { nextCursor: next },
  );
});

export const markRead = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  if (!mongoose.Types.ObjectId.isValid(req.params.nid)) {
    throw AppError.notFound('Notification not found');
  }
  const n = await Notification.findOneAndUpdate(
    { _id: req.params.nid, userId: req.user._id, readAt: { $exists: false } },
    { $set: { readAt: new Date() } },
    { new: true },
  );
  if (!n) throw AppError.notFound('Notification not found');
  ok(res, { id: String(n._id), readAt: n.readAt });
});

export const markAllRead = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  const now = new Date();
  const result = await Notification.updateMany(
    { userId: req.user._id, readAt: { $exists: false } },
    { $set: { readAt: now } },
  );
  ok(res, { updated: result.modifiedCount, readAt: now });
});

function serializePrefs(prefs: INotificationPreferences | undefined): INotificationPreferences {
  const out = defaultNotificationPreferences();
  if (!prefs) return out;
  for (const k of NOTIFICATION_PREF_KEYS) {
    const row = prefs[k];
    if (row) {
      out[k] = {
        push: typeof row.push === 'boolean' ? row.push : true,
        email: typeof row.email === 'boolean' ? row.email : true,
      };
    }
  }
  return out;
}

export const getPreferences = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  ok(res, { preferences: serializePrefs(req.user.notificationPreferences) });
});

export const updatePreferences = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  const incoming = req.body?.preferences as Record<string, { push?: unknown; email?: unknown }> | undefined;
  if (!incoming || typeof incoming !== 'object') {
    throw AppError.invalidInput('preferences object required');
  }
  const current = serializePrefs(req.user.notificationPreferences);
  for (const k of NOTIFICATION_PREF_KEYS) {
    const row = incoming[k];
    if (row && typeof row === 'object') {
      if (typeof row.push === 'boolean') current[k as NotificationPrefKey].push = row.push;
      if (typeof row.email === 'boolean') current[k as NotificationPrefKey].email = row.email;
    }
  }
  req.user.notificationPreferences = current;
  await req.user.save();
  ok(res, { preferences: current });
});
