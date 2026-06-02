import mongoose, { Schema, Document, Types, Model } from 'mongoose';

export type SubscriptionPlan = 'monthly' | 'annual';
export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'incomplete';

export interface ISubscription extends Document {
  _id: Types.ObjectId;
  communityId: Types.ObjectId;
  userId: Types.ObjectId;
  stripeSubscriptionId: string;
  stripeCustomerId?: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
  updatedAt: Date;
  toClientJSON(): Record<string, unknown>;
}

const subscriptionSchema = new Schema<ISubscription>(
  {
    communityId: { type: Schema.Types.ObjectId, ref: 'Community', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    stripeSubscriptionId: { type: String, required: true, unique: true },
    stripeCustomerId: String,
    plan: { type: String, enum: ['monthly', 'annual'], required: true },
    status: {
      type: String,
      enum: ['active', 'past_due', 'cancelled', 'incomplete'],
      default: 'incomplete',
    },
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    cancelAtPeriodEnd: { type: Boolean, default: false },
  },
  { timestamps: true },
);

subscriptionSchema.index({ userId: 1, communityId: 1 });
subscriptionSchema.index({ status: 1, currentPeriodEnd: 1 });

subscriptionSchema.methods.toClientJSON = function toClientJSON(this: ISubscription) {
  return {
    id: String(this._id),
    communityId: String(this.communityId),
    userId: String(this.userId),
    plan: this.plan,
    status: this.status,
    currentPeriodStart: this.currentPeriodStart,
    currentPeriodEnd: this.currentPeriodEnd,
    cancelAtPeriodEnd: this.cancelAtPeriodEnd,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Subscription: Model<ISubscription> = mongoose.model<ISubscription>(
  'Subscription',
  subscriptionSchema,
);
export default Subscription;
