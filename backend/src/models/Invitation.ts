import mongoose, { Schema, Document, Types, Model } from 'mongoose';
import type { CommunityRole } from './Membership';

export interface IInvitation extends Document {
  _id: Types.ObjectId;
  communityId: Types.ObjectId;
  invitedBy: Types.ObjectId;
  email: string;
  role: CommunityRole;
  token: string;
  expiresAt: Date;
  acceptedAt?: Date;
  acceptedByUserId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const invitationSchema = new Schema<IInvitation>(
  {
    communityId: { type: Schema.Types.ObjectId, ref: 'Community', required: true, index: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    role: {
      type: String,
      enum: ['member', 'event_manager', 'subadmin', 'admin'],
      default: 'member',
    },
    token: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true },
    acceptedAt: Date,
    acceptedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

invitationSchema.index({ communityId: 1, email: 1 });
invitationSchema.index({ expiresAt: 1 });

export const Invitation: Model<IInvitation> = mongoose.model<IInvitation>(
  'Invitation',
  invitationSchema,
);
export default Invitation;
