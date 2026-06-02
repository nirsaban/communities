import mongoose, { Schema, Document, Types, Model } from 'mongoose';

export type PaymentStatus =
  | 'pending'
  | 'succeeded'
  | 'failed'
  | 'refunded'
  | 'partial_refund';

export interface IPayment extends Document {
  _id: Types.ObjectId;
  communityId: Types.ObjectId;
  userId: Types.ObjectId;
  eventId?: Types.ObjectId;
  rsvpId?: Types.ObjectId;
  subscriptionId?: Types.ObjectId;
  stripePaymentIntentId?: string;
  stripeCheckoutSessionId?: string;
  amountCents: number;
  currency: string;
  status: PaymentStatus;
  refundedAmountCents: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  toClientJSON(): Record<string, unknown>;
}

const paymentSchema = new Schema<IPayment>(
  {
    communityId: { type: Schema.Types.ObjectId, ref: 'Community', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', index: true },
    rsvpId: { type: Schema.Types.ObjectId, ref: 'EventRSVP' },
    subscriptionId: { type: Schema.Types.ObjectId, ref: 'Subscription' },
    stripePaymentIntentId: { type: String },
    stripeCheckoutSessionId: { type: String },
    amountCents: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'USD' },
    status: {
      type: String,
      enum: ['pending', 'succeeded', 'failed', 'refunded', 'partial_refund'],
      default: 'pending',
    },
    refundedAmountCents: { type: Number, default: 0, min: 0 },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

paymentSchema.index({ communityId: 1, createdAt: -1 });
paymentSchema.index({ userId: 1, status: 1 });
// Sparse unique: lookup-friendly without conflicting on pending rows that don't yet have an intent.
paymentSchema.index({ stripePaymentIntentId: 1 }, { unique: true, sparse: true });
paymentSchema.index({ stripeCheckoutSessionId: 1 }, { unique: true, sparse: true });

paymentSchema.methods.toClientJSON = function toClientJSON(this: IPayment) {
  return {
    id: String(this._id),
    communityId: String(this.communityId),
    userId: String(this.userId),
    eventId: this.eventId ? String(this.eventId) : null,
    rsvpId: this.rsvpId ? String(this.rsvpId) : null,
    subscriptionId: this.subscriptionId ? String(this.subscriptionId) : null,
    amountCents: this.amountCents,
    currency: this.currency,
    status: this.status,
    refundedAmountCents: this.refundedAmountCents,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Payment: Model<IPayment> = mongoose.model<IPayment>('Payment', paymentSchema);
export default Payment;
