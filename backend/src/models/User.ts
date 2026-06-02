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

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  name: string;
  photoUrl?: string;
  bio?: string;
  interests: string[];
  notificationPreferences?: INotificationPreferences;
  globalRole: GlobalRole;
  status: UserStatus;
  emailVerifiedAt?: Date;
  lastLoginAt?: Date;
  onboarding: IUserOnboarding;
  passwordResetTokenHash?: string;
  passwordResetExpiresAt?: Date;
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
    notificationPreferences: { type: notificationPreferencesSchema, default: undefined },
    globalRole: { type: String, enum: ['user', 'superadmin'], default: 'user', index: true },
    status: { type: String, enum: ['active', 'disabled'], default: 'active', index: true },
    emailVerifiedAt: Date,
    lastLoginAt: Date,
    onboarding: { type: onboardingSchema, default: () => ({}) },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpiresAt: { type: Date, select: false },
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
