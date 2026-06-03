import mongoose, { Schema, Document, Types, Model } from 'mongoose';

export type SubscriptionPlan = 'monthly' | 'annual';
export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'incomplete';
export type SubscriptionGateway = 'payplus' | 'external';

export interface ISubscription extends Document {
  _id: Types.ObjectId;
  communityId: Types.ObjectId;
  userId: Types.ObjectId;
  gateway: SubscriptionGateway;
  gatewaySubscriptionId?: string;
  gatewayToken?: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd: boolean;
  failedAttempts: number;
  createdAt: Date;
  updatedAt: Date;
  toClientJSON(): Record<string, unknown>;
}

const subscriptionSchema = new Schema<ISubscription>(
  {
    communityId: { type: Schema.Types.ObjectId, ref: 'Community', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    gateway: {
      type: String,
      enum: ['payplus', 'external'],
      default: 'payplus',
      required: true,
    },
    gatewaySubscriptionId: { type: String },
    // gatewayToken is the PayPlus card token used by the retry job to recharge after past_due.
    // Excluded from default queries to keep it out of API responses.
    gatewayToken: { type: String, select: false },
    plan: { type: String, enum: ['monthly', 'annual'], required: true },
    status: {
      type: String,
      enum: ['active', 'past_due', 'cancelled', 'incomplete'],
      default: 'incomplete',
    },
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    cancelAtPeriodEnd: { type: Boolean, default: false },
    failedAttempts: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

subscriptionSchema.index({ userId: 1, communityId: 1 });
subscriptionSchema.index({ gatewaySubscriptionId: 1 }, { unique: true, sparse: true });
subscriptionSchema.index({ status: 1, currentPeriodEnd: 1 });

subscriptionSchema.methods.toClientJSON = function toClientJSON(this: ISubscription) {
  return {
    id: String(this._id),
    communityId: String(this.communityId),
    userId: String(this.userId),
    gateway: this.gateway,
    gatewaySubscriptionId: this.gatewaySubscriptionId ?? null,
    // gatewayToken intentionally omitted — never returned in client responses.
    plan: this.plan,
    status: this.status,
    currentPeriodStart: this.currentPeriodStart,
    currentPeriodEnd: this.currentPeriodEnd,
    cancelAtPeriodEnd: this.cancelAtPeriodEnd,
    failedAttempts: this.failedAttempts,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Subscription: Model<ISubscription> = mongoose.model<ISubscription>(
  'Subscription',
  subscriptionSchema,
);
export default Subscription;
