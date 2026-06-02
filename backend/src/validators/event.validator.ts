import { z } from 'zod';

const objectIdLike = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

const locationSchema = z.object({
  type: z.enum(['physical', 'online', 'hybrid']).default('physical'),
  address: z.string().max(500).optional(),
  url: z.string().url().optional(),
});

const speakerSchema = z.object({
  name: z.string().min(1).max(120),
  bio: z.string().max(1000).optional(),
  photoUrl: z.string().url().optional(),
});

const pricingSchema = z.object({
  type: z.enum(['free', 'paid', 'subscription_only', 'external']).default('free'),
  priceCents: z.number().int().min(0).default(0),
  currency: z.string().length(3).default('USD'),
  refundPolicyHours: z.number().int().min(0).optional(),
  externalUrl: z.string().url().optional(),
  subscriptionIncluded: z.boolean().optional(),
});

const recurrenceRuleSchema = z
  .object({
    freq: z.enum(['daily', 'weekly', 'biweekly', 'monthly']),
    interval: z.number().int().min(1).max(52).default(1),
    // Two-letter weekday codes per iCal (MO, TU, WE, TH, FR, SA, SU).
    byDay: z.array(z.enum(['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'])).max(7).optional(),
    byMonthDay: z.number().int().min(1).max(31).optional(),
    endType: z.enum(['never', 'until', 'count']).default('count'),
    until: z.coerce.date().optional(),
    count: z.number().int().min(1).max(365).optional(),
  })
  .refine(
    (r) =>
      r.endType !== 'until' || r.until !== undefined,
    { message: 'until is required when endType=until', path: ['until'] },
  )
  .refine(
    (r) => r.endType !== 'count' || r.count !== undefined,
    { message: 'count is required when endType=count', path: ['count'] },
  );

export const createEventSchema = z
  .object({
    title: z.string().min(2).max(200),
    description: z.string().max(10000).optional().default(''),
    category: z.string().max(60).optional(),
    coverImageUrl: z.string().url().optional(),
    type: z.enum(['one_time', 'recurring']).default('one_time'),
    recurrenceRule: recurrenceRuleSchema.optional(),
    startAt: z.coerce.date(),
    endAt: z.coerce.date(),
    timezone: z.string().max(60).default('UTC'),
    location: locationSchema.default({ type: 'physical' }),
    capacity: z.number().int().positive().nullable().optional(),
    speakers: z.array(speakerSchema).max(50).default([]),
    pricing: pricingSchema.default({ type: 'free', priceCents: 0, currency: 'USD' }),
    visibility: z.enum(['community', 'invite']).default('community'),
    status: z.enum(['draft', 'published']).default('draft'),
  })
  .refine((d) => d.endAt > d.startAt, {
    message: 'endAt must be after startAt',
    path: ['endAt'],
  })
  .refine(
    (d) => d.type !== 'recurring' || d.recurrenceRule !== undefined,
    { message: 'recurrenceRule is required when type=recurring', path: ['recurrenceRule'] },
  );

export const updateEventSchema = z
  .object({
    title: z.string().min(2).max(200).optional(),
    description: z.string().max(10000).optional(),
    category: z.string().max(60).optional(),
    coverImageUrl: z.string().url().optional(),
    startAt: z.coerce.date().optional(),
    endAt: z.coerce.date().optional(),
    timezone: z.string().max(60).optional(),
    location: locationSchema.partial().optional(),
    capacity: z.number().int().positive().nullable().optional(),
    speakers: z.array(speakerSchema).max(50).optional(),
    pricing: pricingSchema.partial().optional(),
    visibility: z.enum(['community', 'invite']).optional(),
    status: z.enum(['draft', 'published', 'completed']).optional(),
  })
  .strict();

// Scoped edits on recurring series. Defaults to 'this' (single instance).
export const updateScopeQuerySchema = z.object({
  scope: z.enum(['this', 'future', 'all']).default('this'),
});

export const cancelEventSchema = z.object({
  reason: z.string().max(1000).optional(),
});

export const listEventsSchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
  cursor: z.string().optional(),
  status: z.enum(['draft', 'published', 'cancelled', 'completed']).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const rsvpSchema = z.object({
  status: z.enum(['going', 'not_going', 'maybe']).default('going'),
  notes: z.string().max(500).optional(),
});

export const assignManagerSchema = z.object({
  userId: objectIdLike,
});

export const createMaterialSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(1000).optional(),
  type: z.enum(['pdf', 'video', 'audio', 'image', 'slides', 'other']).default('other'),
});

export const eidParamSchema = z.object({ eid: objectIdLike });
export const eidUidParamSchema = z.object({ eid: objectIdLike, uid: objectIdLike });

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type RsvpInput = z.infer<typeof rsvpSchema>;
export type CreateMaterialInput = z.infer<typeof createMaterialSchema>;
