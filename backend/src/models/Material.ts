import mongoose, { Schema, Document, Types, Model } from 'mongoose';

export type MaterialType = 'pdf' | 'video' | 'audio' | 'image' | 'slides' | 'other';

export interface IMaterial extends Document {
  _id: Types.ObjectId;
  eventId: Types.ObjectId;
  communityId: Types.ObjectId;
  title: string;
  description?: string;
  type: MaterialType;
  fileUrl: string;
  fileSizeBytes?: number;
  durationSeconds?: number;
  uploadedBy?: Types.ObjectId;
  createdAt: Date;
  toClientJSON(): Record<string, unknown>;
}

const materialSchema = new Schema<IMaterial>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    communityId: { type: Schema.Types.ObjectId, ref: 'Community', required: true },
    title: { type: String, required: true },
    description: String,
    type: {
      type: String,
      enum: ['pdf', 'video', 'audio', 'image', 'slides', 'other'],
      default: 'other',
    },
    fileUrl: { type: String, required: true },
    fileSizeBytes: Number,
    durationSeconds: Number,
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

materialSchema.index({ eventId: 1, createdAt: -1 });

materialSchema.methods.toClientJSON = function toClientJSON(this: IMaterial) {
  return {
    id: String(this._id),
    eventId: String(this.eventId),
    communityId: String(this.communityId),
    title: this.title,
    description: this.description,
    type: this.type,
    fileUrl: this.fileUrl,
    fileSizeBytes: this.fileSizeBytes,
    durationSeconds: this.durationSeconds,
    uploadedBy: this.uploadedBy ? String(this.uploadedBy) : null,
    createdAt: this.createdAt,
  };
};

export const Material: Model<IMaterial> = mongoose.model<IMaterial>('Material', materialSchema);
export default Material;
