import mongoose, { Schema, Document, Types, Model } from 'mongoose';

export interface INotification extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  communityId?: Types.ObjectId | null;
  type: string;
  title: string;
  body: string;
  payload?: Record<string, unknown>;
  readAt?: Date;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    communityId: { type: Schema.Types.ObjectId, ref: 'Community', default: null },
    type: { type: String, required: true, index: true },
    title: { type: String, required: true },
    body: { type: String, default: '' },
    payload: { type: Schema.Types.Mixed, default: {} },
    readAt: Date,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

notificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });

export const Notification: Model<INotification> = mongoose.model<INotification>(
  'Notification',
  notificationSchema,
);
export default Notification;
