import mongoose, { Schema, Document, Types, Model } from 'mongoose';

export type RsvpStatus = 'going' | 'not_going' | 'maybe' | 'waitlist' | 'cancelled';
export type RsvpPaymentStatus = 'none' | 'pending' | 'paid' | 'refunded';

export interface IEventRSVP extends Document {
  _id: Types.ObjectId;
  eventId: Types.ObjectId;
  communityId: Types.ObjectId;
  userId: Types.ObjectId;
  status: RsvpStatus;
  paymentId?: Types.ObjectId;
  paymentStatus: RsvpPaymentStatus;
  attendedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  toClientJSON(): Record<string, unknown>;
}

const eventRsvpSchema = new Schema<IEventRSVP>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    communityId: { type: Schema.Types.ObjectId, ref: 'Community', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: {
      type: String,
      enum: ['going', 'not_going', 'maybe', 'waitlist', 'cancelled'],
      default: 'going',
    },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment' },
    paymentStatus: {
      type: String,
      enum: ['none', 'pending', 'paid', 'refunded'],
      default: 'none',
    },
    attendedAt: Date,
    notes: String,
  },
  { timestamps: true },
);

eventRsvpSchema.index({ eventId: 1, userId: 1 }, { unique: true });
eventRsvpSchema.index({ userId: 1, status: 1 });
eventRsvpSchema.index({ eventId: 1, status: 1 });

eventRsvpSchema.methods.toClientJSON = function toClientJSON(this: IEventRSVP) {
  return {
    id: String(this._id),
    eventId: String(this.eventId),
    communityId: String(this.communityId),
    userId: String(this.userId),
    status: this.status,
    paymentStatus: this.paymentStatus,
    attendedAt: this.attendedAt,
    notes: this.notes,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const EventRSVP: Model<IEventRSVP> = mongoose.model<IEventRSVP>('EventRSVP', eventRsvpSchema);
export default EventRSVP;
