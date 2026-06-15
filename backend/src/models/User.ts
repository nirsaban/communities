import mongoose, { Schema, Document, Types, Model } from 'mongoose';

export type GlobalRole = 'user' | 'superadmin';
export type UserStatus = 'active' | 'disabled';

export interface IUserOnboarding {
  appOnboardingCompletedAt?: Date;
  profileCompletedAt?: Date;
  interestsCompletedAt?: Date;
}

// Per-channel × per-type toggles for the NotificationPreferences screen.
// Keys are the broad notification families surfaced in /settings/notifications.
export const NOTIFICATION_PREF_KEYS = [
  'events',
  'rsvp',
  'initiatives',
  'posts',
  'system',
] as const;
export type NotificationPrefKey = (typeof NOTIFICATION_PREF_KEYS)[number];

export interface INotificationChannelPrefs {
  push: boolean;
  email: boolean;
}

export type INotificationPreferences = Record<NotificationPrefKey, INotificationChannelPrefs>;

export type ProfileVisibility = 'public' | 'members_only' | 'private';

export interface IPrivacyPreferences {
  profileVisibility: ProfileVisibility;
  showAttendedEvents: boolean;
  showInitiativesSupported: boolean;
  allowMentions: boolean;
}

export function defaultPrivacyPreferences(): IPrivacyPreferences {
  return {
    profileVisibility: 'members_only',
    showAttendedEvents: true,
    showInitiativesSupported: true,
    allowMentions: true,
  };
}

// Networking + personal fields surfaced on /profile per §3.10 of the brief.
// These power member-to-member networking (job/company), recommendation
// signals, and optional in-profile contact links. All fields are optional and
// public-by-default within the community (gated by IPrivacyPreferences).
export interface IUserProfile {
  jobTitle?: string;
  profession?: string;
  company?: string;
  livingLocation?: string;
  relationshipStatus?: 'single' | 'in_relationship' | 'married' | 'other';
  socials?: {
    instagram?: string;
    x?: string;
    linkedin?: string;
    facebook?: string;
    tiktok?: string;
    website?: string;
  };
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  name: string;
  photoUrl?: string;
  bio?: string;
  interests: string[];
  profile?: IUserProfile;
  notificationPreferences?: INotificationPreferences;
  privacy?: IPrivacyPreferences;
  globalRole: GlobalRole;
  status: UserStatus;
  emailVerifiedAt?: Date;
  lastLoginAt?: Date;
  onboarding: IUserOnboarding;
  passwordResetTokenHash?: string;
  passwordResetExpiresAt?: Date;
  emailVerificationCodeHash?: string;
  emailVerificationExpiresAt?: Date;
  // Set when the user requests soft-deletion. Background job purges after this date.
  scheduledDeletionAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  toSafeJSON(): SafeUser;
}

export interface SafeUser {
  id: string;
  email: string;
  name: string;
  photoUrl?: string;
  bio?: string;
  interests: string[];
  profile?: IUserProfile;
  globalRole: GlobalRole;
  status: UserStatus;
  emailVerifiedAt?: Date;
  lastLoginAt?: Date;
  onboarding: IUserOnboarding;
  createdAt: Date;
  updatedAt: Date;
}

const onboardingSchema = new Schema<IUserOnboarding>(
  {
    appOnboardingCompletedAt: Date,
    profileCompletedAt: Date,
    interestsCompletedAt: Date,
  },
  { _id: false },
);

const socialsSchema = new Schema(
  {
    instagram: String,
    x: String,
    linkedin: String,
    facebook: String,
    tiktok: String,
    website: String,
  },
  { _id: false },
);

const profileSchema = new Schema<IUserProfile>(
  {
    jobTitle: { type: String, trim: true, maxlength: 100 },
    profession: { type: String, trim: true, maxlength: 100 },
    company: { type: String, trim: true, maxlength: 120 },
    livingLocation: { type: String, trim: true, maxlength: 120 },
    relationshipStatus: {
      type: String,
      enum: ['single', 'in_relationship', 'married', 'other'],
    },
    socials: { type: socialsSchema, default: undefined },
  },
  { _id: false },
);

const channelPrefsSchema = new Schema<INotificationChannelPrefs>(
  {
    push: { type: Boolean, default: true },
    email: { type: Boolean, default: true },
  },
  { _id: false },
);

const notificationPreferencesSchema = new Schema<INotificationPreferences>(
  Object.fromEntries(
    NOTIFICATION_PREF_KEYS.map((k) => [k, { type: channelPrefsSchema, default: () => ({}) }]),
  ),
  { _id: false },
);

const privacySchema = new Schema<IPrivacyPreferences>(
  {
    profileVisibility: {
      type: String,
      enum: ['public', 'members_only', 'private'],
      default: 'members_only',
    },
    showAttendedEvents: { type: Boolean, default: true },
    showInitiativesSupported: { type: Boolean, default: true },
    allowMentions: { type: Boolean, default: true },
  },
  { _id: false },
);

export function defaultNotificationPreferences(): INotificationPreferences {
  return Object.fromEntries(
    NOTIFICATION_PREF_KEYS.map((k) => [k, { push: true, email: true }]),
  ) as INotificationPreferences;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, trim: true, default: '' },
    photoUrl: String,
    bio: String,
    interests: { type: [String], default: [] },
    profile: { type: profileSchema, default: undefined },
    notificationPreferences: { type: notificationPreferencesSchema, default: undefined },
    privacy: { type: privacySchema, default: undefined },
    globalRole: { type: String, enum: ['user', 'superadmin'], default: 'user', index: true },
    status: { type: String, enum: ['active', 'disabled'], default: 'active', index: true },
    emailVerifiedAt: Date,
    lastLoginAt: Date,
    onboarding: { type: onboardingSchema, default: () => ({}) },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpiresAt: { type: Date, select: false },
    emailVerificationCodeHash: { type: String, select: false },
    emailVerificationExpiresAt: { type: Date, select: false },
    scheduledDeletionAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

userSchema.methods.toSafeJSON = function toSafeJSON(this: IUser): SafeUser {
  return {
    id: String(this._id),
    email: this.email,
    name: this.name,
    photoUrl: this.photoUrl,
    bio: this.bio,
    interests: this.interests,
    profile: this.profile,
    globalRole: this.globalRole,
    status: this.status,
    emailVerifiedAt: this.emailVerifiedAt,
    lastLoginAt: this.lastLoginAt,
    onboarding: this.onboarding,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);
export default User;
