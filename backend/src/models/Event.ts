import mongoose, { Schema, Document, Types, Model } from 'mongoose';

export type EventType = 'one_time' | 'recurring_parent' | 'recurring_instance';
export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed';
export type EventVisibility = 'community' | 'invite';
export type LocationType = 'physical' | 'online' | 'hybrid';
export type PricingType = 'free' | 'paid' | 'subscription_only' | 'external';

export interface IRecurrenceRule {
  freq?: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom';
  interval?: number;
  byDay?: string[];
  byMonthDay?: number;
  endType?: 'never' | 'until' | 'count';
  until?: Date;
  count?: number;
}

export interface ILocation {
  type: LocationType;
  address?: string;
  url?: string;
}

export interface ISpeaker {
  name: string;
  bio?: string;
  photoUrl?: string;
}

export interface IPricing {
  type: PricingType;
  priceCents: number;
  currency: string;
  maxInstallments: number;
  refundPolicyHours?: number;
  externalUrl?: string;
  subscriptionIncluded?: boolean;
}

export interface IEvent extends Document {
  _id: Types.ObjectId;
  communityId: Types.ObjectId;
  title: string;
  description: string;
  category?: string;
  coverImageUrl?: string;
  type: EventType;
  recurrenceRule?: IRecurrenceRule;
  parentEventId?: Types.ObjectId;
  startAt: Date;
  endAt: Date;
  timezone: string;
  location: ILocation;
  capacity?: number | null;
  speakers: ISpeaker[];
  pricing: IPricing;
  status: EventStatus;
  visibility: EventVisibility;
  managers: Types.ObjectId[];
  createdBy?: Types.ObjectId;
  metrics: {
    rsvpCount: number;
    paidCount: number;
    waitlistCount: number;
    totalRevenueCents: number;
  };
  summary?: { publishedAt?: Date; body?: string; photoUrls?: string[] };
  cancelledAt?: Date;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
  toClientJSON(): Record<string, unknown>;
}

const recurrenceRuleSchema = new Schema<IRecurrenceRule>(
  {
    freq: { type: String, enum: ['daily', 'weekly', 'biweekly', 'monthly', 'custom'] },
    interval: Number,
    byDay: [String],
    byMonthDay: Number,
    endType: { type: String, enum: ['never', 'until', 'count'] },
    until: Date,
    count: Number,
  },
  { _id: false },
);

const locationSchema = new Schema<ILocation>(
  {
    type: { type: String, enum: ['physical', 'online', 'hybrid'], default: 'physical' },
    address: String,
    url: String,
  },
  { _id: false },
);

const speakerSchema = new Schema<ISpeaker>(
  { name: { type: String, required: true }, bio: String, photoUrl: String },
  { _id: false },
);

const pricingSchema = new Schema<IPricing>(
  {
    type: {
      type: String,
      enum: ['free', 'paid', 'subscription_only', 'external'],
      default: 'free',
    },
    priceCents: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'ILS' },
    // Capped at 12 — PayPlus תשלומים supports 1–12 monthly installments.
    maxInstallments: { type: Number, default: 1, min: 1, max: 12 },
    refundPolicyHours: Number,
    externalUrl: String,
    subscriptionIncluded: Boolean,
  },
  { _id: false },
);

const eventSchema = new Schema<IEvent>(
  {
    communityId: { type: Schema.Types.ObjectId, ref: 'Community', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: '', maxlength: 10000 },
    category: String,
    coverImageUrl: String,
    type: {
      type: String,
      enum: ['one_time', 'recurring_parent', 'recurring_instance'],
      default: 'one_time',
    },
    // Reserved for future recurring support (P5). Unused in P3.
    recurrenceRule: recurrenceRuleSchema,
    parentEventId: { type: Schema.Types.ObjectId, ref: 'Event', index: true },

    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    timezone: { type: String, default: 'UTC' },
    location: { type: locationSchema, default: () => ({ type: 'physical' }) },
    capacity: { type: Number, default: null, min: 1 },
    speakers: { type: [speakerSchema], default: [] },
    pricing: {
      type: pricingSchema,
      default: () => ({ type: 'free', priceCents: 0, currency: 'ILS', maxInstallments: 1 }),
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'cancelled', 'completed'],
      default: 'draft',
    },
    visibility: { type: String, enum: ['community', 'invite'], default: 'community' },
    managers: { type: [Schema.Types.ObjectId], ref: 'User', default: [], index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },

    metrics: {
      rsvpCount: { type: Number, default: 0 },
      paidCount: { type: Number, default: 0 },
      waitlistCount: { type: Number, default: 0 },
      totalRevenueCents: { type: Number, default: 0 },
    },
    summary: { publishedAt: Date, body: String, photoUrls: { type: [String], default: [] } },
    cancelledAt: Date,
    cancellationReason: String,
  },
  { timestamps: true },
);

eventSchema.index({ communityId: 1, startAt: 1 });
eventSchema.index({ communityId: 1, status: 1 });
eventSchema.index({ startAt: 1, status: 1 });

eventSchema.methods.toClientJSON = function toClientJSON(this: IEvent) {
  return {
    id: String(this._id),
    communityId: String(this.communityId),
    title: this.title,
    description: this.description,
    category: this.category,
    coverImageUrl: this.coverImageUrl,
    type: this.type,
    startAt: this.startAt,
    endAt: this.endAt,
    timezone: this.timezone,
    location: this.location,
    capacity: this.capacity,
    speakers: this.speakers,
    pricing: this.pricing,
    status: this.status,
    visibility: this.visibility,
    managers: (this.managers || []).map(String),
    createdBy: this.createdBy ? String(this.createdBy) : null,
    metrics: this.metrics,
    summary: this.summary,
    cancelledAt: this.cancelledAt,
    cancellationReason: this.cancellationReason,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const EventModel: Model<IEvent> = mongoose.model<IEvent>('Event', eventSchema);
export default EventModel;
