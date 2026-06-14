import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import asyncHandler from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { ok, created } from '../utils/response';
import { EventQA } from '../models/EventQA';
import { User } from '../models/User';
import { getLoadedEvent } from '../middleware/eventScope';

function ensureScope(req: Request): { eventId: mongoose.Types.ObjectId; communityId: mongoose.Types.ObjectId } {
  const event = getLoadedEvent(req);
  return { eventId: event._id, communityId: event.communityId };
}

// GET /api/v1/events/:eid/qa
export const list = asyncHandler(async (req: Request, res: Response) => {
  const { eventId } = ensureScope(req);
  const rows = await EventQA.find({ eventId }).sort({ pinned: -1, createdAt: -1 }).limit(200);
  const viewerId = req.user ? String(req.user._id) : null;
  // Join author names so the manager triage UI can show real people instead of
  // a generic "Community member" label on every row (PRD 08 §5 — Q&A is not
  // anonymous). One round-trip per list call, scoped to authors in this page.
  const authorIds = Array.from(new Set(rows.map((q) => String(q.userId))));
  const users = await User.find({ _id: { $in: authorIds } })
    .select({ _id: 1, name: 1, photoUrl: 1 })
    .lean();
  const userMap = new Map<string, { name: string; photoUrl?: string }>();
  for (const u of users) {
    userMap.set(String(u._id), {
      name: (u as { name?: string }).name ?? '',
      photoUrl: (u as { photoUrl?: string }).photoUrl ?? undefined,
    });
  }
  ok(
    res,
    rows.map((q) => {
      const json = q.toClientJSON(viewerId);
      const u = userMap.get(String(q.userId));
      return {
        ...json,
        authorName: u?.name || null,
        authorPhotoUrl: u?.photoUrl || null,
      };
    }),
  );
});

// POST /api/v1/events/:eid/qa  body: { question }
export const create = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  const { eventId, communityId } = ensureScope(req);
  const question = String(req.body?.question ?? '').trim();
  if (question.length < 3) throw AppError.invalidInput('question must be ≥3 chars');
  if (question.length > 1000) throw AppError.invalidInput('question too long');
  const q = await EventQA.create({
    eventId,
    communityId,
    userId: req.user._id,
    question,
  });
  created(res, q.toClientJSON(String(req.user._id)));
});

// POST /api/v1/events/:eid/qa/:qid/upvote — toggle vote
export const upvote = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  const { eventId } = ensureScope(req);
  if (!mongoose.Types.ObjectId.isValid(req.params.qid)) {
    throw AppError.notFound('Question not found');
  }
  const q = await EventQA.findOne({ _id: req.params.qid, eventId });
  if (!q) throw AppError.notFound('Question not found');
  const uid = req.user._id;
  const i = q.upvoteUserIds.findIndex((x) => String(x) === String(uid));
  if (i >= 0) q.upvoteUserIds.splice(i, 1);
  else q.upvoteUserIds.push(uid);
  await q.save();
  ok(res, q.toClientJSON(String(uid)));
});

// POST /api/v1/events/:eid/qa/:qid/answer  body: { body }   (event manager / admin)
export const answer = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  const { eventId } = ensureScope(req);
  if (!mongoose.Types.ObjectId.isValid(req.params.qid)) {
    throw AppError.notFound('Question not found');
  }
  const body = String(req.body?.body ?? '').trim();
  if (body.length < 1) throw AppError.invalidInput('answer body required');
  const q = await EventQA.findOne({ _id: req.params.qid, eventId });
  if (!q) throw AppError.notFound('Question not found');
  q.answer = { body, answeredByUserId: req.user._id, answeredAt: new Date() };
  if (!q.resolvedAt) q.resolvedAt = new Date();
  await q.save();
  ok(res, q.toClientJSON(String(req.user._id)));
});

// POST /api/v1/events/:eid/qa/:qid/pin   (toggle)
export const pin = asyncHandler(async (req: Request, res: Response) => {
  const { eventId } = ensureScope(req);
  if (!mongoose.Types.ObjectId.isValid(req.params.qid)) {
    throw AppError.notFound('Question not found');
  }
  const q = await EventQA.findOne({ _id: req.params.qid, eventId });
  if (!q) throw AppError.notFound('Question not found');
  q.pinned = !q.pinned;
  await q.save();
  ok(res, q.toClientJSON(req.user ? String(req.user._id) : null));
});

// POST /api/v1/events/:eid/qa/:qid/resolve  (toggle)
export const resolve = asyncHandler(async (req: Request, res: Response) => {
  const { eventId } = ensureScope(req);
  if (!mongoose.Types.ObjectId.isValid(req.params.qid)) {
    throw AppError.notFound('Question not found');
  }
  const q = await EventQA.findOne({ _id: req.params.qid, eventId });
  if (!q) throw AppError.notFound('Question not found');
  q.resolvedAt = q.resolvedAt ? null : new Date();
  await q.save();
  ok(res, q.toClientJSON(req.user ? String(req.user._id) : null));
});
