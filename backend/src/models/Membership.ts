import mongoose, { Schema, Document, Types, Model } from 'mongoose';

export type CommunityRole = 'member' | 'event_manager' | 'subadmin' | 'admin';
export type MembershipStatus = 'active' | 'pending' | 'banned';

export interface IMembership extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  communityId: Types.ObjectId;
  role: CommunityRole;
  status: MembershipStatus;
  joinedAt: Date;
  invitedBy?: Types.ObjectId;
  onboarding?: {
    communityOnboardingCompletedAt?: Date;
    rulesAcceptedAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
  toClientJSON(): Record<string, unknown>;
}

const membershipSchema = new Schema<IMembership>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    communityId: { type: Schema.Types.ObjectId, ref: 'Community', required: true, index: true },
    role: {
      type: String,
      enum: ['member', 'event_manager', 'subadmin', 'admin'],
      default: 'member',
    },
    status: { type: String, enum: ['active', 'pending', 'banned'], default: 'active' },
    joinedAt: { type: Date, default: Date.now },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    onboarding: {
      communityOnboardingCompletedAt: Date,
      rulesAcceptedAt: Date,
    },
  },
  { timestamps: true },
);

membershipSchema.index({ userId: 1, communityId: 1 }, { unique: true });
membershipSchema.index({ communityId: 1, role: 1 });
membershipSchema.index({ communityId: 1, status: 1 });

membershipSchema.methods.toClientJSON = function toClientJSON(this: IMembership) {
  return {
    id: String(this._id),
    userId: String(this.userId),
    communityId: String(this.communityId),
    role: this.role === 'event_manager' ? 'eventManager' : this.role,
    status: this.status,
    joinedAt: this.joinedAt,
    invitedBy: this.invitedBy ? String(this.invitedBy) : null,
    onboarding: this.onboarding,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Membership: Model<IMembership> = mongoose.model<IMembership>(
  'Membership',
  membershipSchema,
);
export default Membership;
