import mongoose, { Schema, Document, Types, Model } from 'mongoose';

export type CommunityCategory =
  | 'religious'
  | 'educational'
  | 'professional'
  | 'hobby'
  | 'other';

export type CommunityPrivacy = 'public' | 'invite_only' | 'application';
export type CommunityStatus = 'active' | 'suspended' | 'deleted';

export interface IOnboardingSteps {
  basics: boolean;
  branding: boolean;
  privacy: boolean;
  experience: boolean;
  firstEvent: boolean;
  firstInvites: boolean;
}

export interface ICommunitySettings {
  branding?: {
    primaryColor?: string;
    accentColor?: string;
  };
  welcomeMessage?: string;
  rules?: string;
  defaultMemberPermissions?: Record<string, unknown>;
}

export interface ICommunity extends Document {
  _id: Types.ObjectId;
  name: string;
  slug?: string;
  description: string;
  category: CommunityCategory;
  logoUrl?: string;
  coverUrl?: string;
  privacy: CommunityPrivacy;
  status: CommunityStatus;
  createdBy?: Types.ObjectId;
  initialAdminId?: Types.ObjectId;
  settings: ICommunitySettings;
  onboarding: {
    wizardCompletedAt?: Date;
    steps: IOnboardingSteps;
  };
  metrics: {
    memberCount: number;
    eventCount: number;
    totalRevenueCents: number;
  };
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  toClientJSON(): Record<string, unknown>;
}

const onboardingSteps = new Schema<IOnboardingSteps>(
  {
    basics: { type: Boolean, default: false },
    branding: { type: Boolean, default: false },
    privacy: { type: Boolean, default: false },
    experience: { type: Boolean, default: false },
    firstEvent: { type: Boolean, default: false },
    firstInvites: { type: Boolean, default: false },
  },
  { _id: false },
);

const communitySchema = new Schema<ICommunity>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, index: true, sparse: true },
    description: { type: String, default: '' },
    category: {
      type: String,
      enum: ['religious', 'educational', 'professional', 'hobby', 'other'],
      default: 'other',
    },
    logoUrl: String,
    coverUrl: String,
    privacy: {
      type: String,
      enum: ['public', 'invite_only', 'application'],
      default: 'invite_only',
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'deleted'],
      default: 'active',
      index: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    initialAdminId: { type: Schema.Types.ObjectId, ref: 'User' },
    settings: {
      branding: { primaryColor: String, accentColor: String },
      welcomeMessage: String,
      rules: String,
      defaultMemberPermissions: { type: Schema.Types.Mixed, default: {} },
    },
    onboarding: {
      wizardCompletedAt: Date,
      steps: { type: onboardingSteps, default: () => ({}) },
    },
    metrics: {
      memberCount: { type: Number, default: 0 },
      eventCount: { type: Number, default: 0 },
      totalRevenueCents: { type: Number, default: 0 },
    },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

communitySchema.methods.toClientJSON = function toClientJSON(this: ICommunity) {
  return {
    id: String(this._id),
    name: this.name,
    slug: this.slug,
    description: this.description,
    category: this.category,
    logoUrl: this.logoUrl,
    coverUrl: this.coverUrl,
    privacy: this.privacy,
    status: this.status,
    settings: this.settings,
    onboarding: this.onboarding,
    metrics: this.metrics,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Community: Model<ICommunity> = mongoose.model<ICommunity>('Community', communitySchema);
export default Community;
