import mongoose, { Types } from 'mongoose';
import { EventModel, IEvent, IRecurrenceRule } from '../models/Event';
import { AppError } from '../utils/AppError';

const DAY_MS = 86_400_000;

const WEEKDAY_INDEX: Record<string, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};

export interface MaterializeOptions {
  /** Generate instances starting at this date (defaults to now). */
  from?: Date;
  /** Don't generate instances after this date (defaults to from + 60 days). */
  horizonDays?: number;
  /** Hard cap to prevent runaway loops on bad rules. */
  maxInstances?: number;
}

/**
 * Expand a recurring parent event into `recurring_instance` child docs that fall
 * within [from, from+horizonDays]. Skips dates that already have an instance.
 *
 * Idempotent: a unique (parentEventId, startAt) index would be cleaner long-term,
 * but for v1 we explicitly query for the existing set first to avoid double-insert.
 */
export async function materializeInstances(
  parentId: Types.ObjectId | string,
  opts: MaterializeOptions = {},
): Promise<IEvent[]> {
  const parent = await EventModel.findById(parentId);
  if (!parent) throw AppError.notFound('Event not found');
  if (parent.type !== 'recurring_parent') {
    throw AppError.invalidInput('Event is not a recurring parent');
  }
  if (!parent.recurrenceRule) {
    throw AppError.invalidInput('Event has no recurrenceRule');
  }

  const from = opts.from ?? new Date();
  const horizonDays = opts.horizonDays ?? 60;
  const maxInstances = opts.maxInstances ?? 365;
  const horizonEnd = new Date(from.getTime() + horizonDays * DAY_MS);

  const rule = parent.recurrenceRule;
  const occurrences = computeOccurrences(parent.startAt, rule, from, horizonEnd, maxInstances);
  if (occurrences.length === 0) return [];

  // Compute event duration once; each instance inherits it.
  const durationMs = parent.endAt.getTime() - parent.startAt.getTime();

  // Skip dates that already have an instance (idempotent re-runs).
  const existing = await EventModel.find({
    parentEventId: parent._id,
    startAt: { $in: occurrences },
  }).select({ startAt: 1 });
  const seen = new Set(existing.map((e) => e.startAt.getTime()));

  const docsToInsert = occurrences
    .filter((d) => !seen.has(d.getTime()))
    .map((startAt) => ({
      communityId: parent.communityId,
      title: parent.title,
      description: parent.description,
      category: parent.category,
      coverImageUrl: parent.coverImageUrl,
      type: 'recurring_instance' as const,
      parentEventId: parent._id,
      startAt,
      endAt: new Date(startAt.getTime() + durationMs),
      timezone: parent.timezone,
      location: parent.location,
      capacity: parent.capacity,
      speakers: parent.speakers,
      pricing: parent.pricing,
      status: parent.status,
      visibility: parent.visibility,
      managers: parent.managers,
      createdBy: parent.createdBy,
    }));

  if (docsToInsert.length === 0) return [];
  const inserted = (await EventModel.insertMany(docsToInsert)) as IEvent[];
  return inserted;
}

/**
 * Pure occurrence math — easy to unit-test without DB.
 */
export function computeOccurrences(
  ruleStartAt: Date,
  rule: IRecurrenceRule,
  rangeStart: Date,
  rangeEnd: Date,
  maxInstances = 365,
): Date[] {
  const interval = Math.max(rule.interval ?? 1, 1);
  const occurrences: Date[] = [];

  // Iteration step (in days) used as the "advance" between candidate dates for each
  // frequency. For weekly/biweekly we walk day-by-day so byDay filtering works.
  let step: number;
  switch (rule.freq) {
    case 'daily':
      step = 1 * interval;
      break;
    case 'weekly':
      step = 1;
      break;
    case 'biweekly':
      step = 1;
      break;
    case 'monthly':
      step = 1; // we re-evaluate via month math below
      break;
    default:
      throw AppError.invalidInput(`Unsupported recurrence frequency: ${rule.freq}`);
  }

  // Allowed weekday set (1=Mon..0=Sun).
  const allowedWeekdays = new Set<number>(
    (rule.byDay ?? []).map((d) => WEEKDAY_INDEX[d]).filter((n) => n !== undefined),
  );

  const seedTimeMs = ruleStartAt.getTime() % DAY_MS; // preserve HH:mm:ss of the seed

  // Compute the earliest candidate date (≥ ruleStartAt and ≥ rangeStart).
  let candidate = new Date(ruleStartAt);
  while (candidate < rangeStart) {
    candidate = advance(candidate, rule.freq, step, interval);
    if (candidate.getTime() - ruleStartAt.getTime() > 365 * 10 * DAY_MS) break; // safety
  }

  const untilLimit =
    rule.endType === 'until' && rule.until ? rule.until.getTime() : Infinity;
  const countLimit = rule.endType === 'count' && rule.count ? rule.count : Infinity;

  let totalSinceStart = 0;
  // Need to also count occurrences that happened BEFORE rangeStart against `count`
  // — otherwise a rule "every Monday, count=4" extended forward would over-emit.
  totalSinceStart += countOccurrencesBetween(ruleStartAt, rule, ruleStartAt, rangeStart);

  while (
    candidate <= rangeEnd &&
    occurrences.length < maxInstances &&
    candidate.getTime() <= untilLimit &&
    totalSinceStart < countLimit
  ) {
    const weekdayOk =
      allowedWeekdays.size === 0 ? true : allowedWeekdays.has(candidate.getDay());
    const monthDayOk =
      rule.byMonthDay === undefined ? true : candidate.getDate() === rule.byMonthDay;
    if (weekdayOk && monthDayOk && candidate >= rangeStart) {
      // Normalize to the seed time-of-day.
      const normalized = new Date(
        Math.floor(candidate.getTime() / DAY_MS) * DAY_MS + seedTimeMs,
      );
      occurrences.push(normalized);
      totalSinceStart += 1;
    }
    candidate = advance(candidate, rule.freq, step, interval);
  }
  return occurrences;
}

function advance(d: Date, freq: IRecurrenceRule['freq'], step: number, interval: number): Date {
  if (freq === 'monthly') {
    const next = new Date(d);
    next.setMonth(next.getMonth() + interval);
    return next;
  }
  if (freq === 'biweekly') {
    // biweekly means step 14 days when we hit a matching weekday.
    return new Date(d.getTime() + DAY_MS);
  }
  return new Date(d.getTime() + step * DAY_MS);
}

/**
 * Used to keep `count` accurate when materializing forward in time after some
 * occurrences have already passed. Walks the same recursion math but only counts.
 */
function countOccurrencesBetween(
  ruleStartAt: Date,
  rule: IRecurrenceRule,
  start: Date,
  end: Date,
): number {
  if (start >= end) return 0;
  const allowedWeekdays = new Set<number>(
    (rule.byDay ?? []).map((d) => WEEKDAY_INDEX[d]).filter((n) => n !== undefined),
  );
  const interval = Math.max(rule.interval ?? 1, 1);
  let candidate = new Date(ruleStartAt);
  let count = 0;
  let guard = 0;
  while (candidate < end && guard < 10_000) {
    guard += 1;
    const weekdayOk =
      allowedWeekdays.size === 0 ? true : allowedWeekdays.has(candidate.getDay());
    const monthDayOk =
      rule.byMonthDay === undefined ? true : candidate.getDate() === rule.byMonthDay;
    if (weekdayOk && monthDayOk && candidate >= start) {
      count += 1;
    }
    candidate = advance(candidate, rule.freq, 1, interval);
  }
  return count;
}

/**
 * Apply a patch with scope: 'this' edits one instance, 'future' splits and edits
 * the chain from this point forward, 'all' edits the entire series + already-
 * materialized instances. Returns the affected events.
 */
export interface ScopedEventPatch {
  title?: string;
  description?: string;
  category?: string;
  coverImageUrl?: string;
  location?: Partial<IEvent['location']>;
  speakers?: IEvent['speakers'];
  capacity?: IEvent['capacity'];
  pricing?: Partial<IEvent['pricing']>;
  visibility?: IEvent['visibility'];
  status?: IEvent['status'];
}

export async function applyScopedEdit(
  target: IEvent,
  patch: ScopedEventPatch,
  scope: 'this' | 'future' | 'all',
): Promise<IEvent[]> {
  const apply = (e: IEvent): IEvent => {
    if (patch.title !== undefined) e.title = patch.title;
    if (patch.description !== undefined) e.description = patch.description;
    if (patch.category !== undefined) e.category = patch.category;
    if (patch.coverImageUrl !== undefined) e.coverImageUrl = patch.coverImageUrl;
    if (patch.capacity !== undefined) e.capacity = patch.capacity;
    if (patch.visibility !== undefined) e.visibility = patch.visibility;
    if (patch.status !== undefined) e.status = patch.status;
    if (patch.location) {
      e.location = { ...(e.location as object), ...patch.location } as IEvent['location'];
    }
    if (patch.pricing) {
      e.pricing = { ...(e.pricing as object), ...patch.pricing } as IEvent['pricing'];
    }
    if (patch.speakers) e.speakers = patch.speakers;
    return e;
  };

  // 'this': only the target document.
  if (scope === 'this') {
    apply(target);
    await target.save();
    return [target];
  }

  // 'all' or 'future': operate on the series.
  if (target.type === 'one_time') {
    apply(target);
    await target.save();
    return [target];
  }

  const parent = target.type === 'recurring_parent'
    ? target
    : await EventModel.findById(target.parentEventId);
  if (!parent) throw AppError.notFound('Parent event missing');

  const session = await mongoose.startSession();
  const updated: IEvent[] = [];
  try {
    await session.withTransaction(async () => {
      const filter: Record<string, unknown> = {
        $or: [
          { _id: parent._id },
          { parentEventId: parent._id },
        ],
      };
      if (scope === 'future' && target.type === 'recurring_instance') {
        filter['$or'] = [
          { _id: parent._id }, // parent itself still considered for series-wide fields
          { parentEventId: parent._id, startAt: { $gte: target.startAt } },
        ];
      }
      const docs = await EventModel.find(filter).session(session);
      for (const doc of docs) {
        apply(doc);
        await doc.save({ session });
        updated.push(doc);
      }
    });
  } finally {
    session.endSession();
  }
  return updated;
}
