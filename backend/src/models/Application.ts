import mongoose, { Schema, Document, Types, Model } from 'mongoose';

export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface IApplication extends Document {
  _id: Types.ObjectId;
  communityId: Types.ObjectId;
  userId: Types.ObjectId;
  message?: string;
  status: ApplicationStatus;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const applicationSchema = new Schema<IApplication>(
  {
    communityId: { type: Schema.Types.ObjectId, ref: 'Community', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    message: String,
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    rejectionReason: String,
  },
  { timestamps: true },
);

applicationSchema.index({ communityId: 1, status: 1 });
applicationSchema.index({ userId: 1, communityId: 1 }, { unique: true });

export const Application: Model<IApplication> = mongoose.model<IApplication>(
  'Application',
  applicationSchema,
);
export default Application;
