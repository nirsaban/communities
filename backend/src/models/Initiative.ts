import mongoose, { Schema, Document, Types, Model } from 'mongoose';

export type InitiativeStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'active'
  | 'completed'
  | 'rejected';

export type InitiativeCategory = 'event' | 'volunteer' | 'product' | 'social' | 'other';

export interface IInitiative extends Document {
  _id: Types.ObjectId;
  communityId: Types.ObjectId;
  authorId: Types.ObjectId;
  title: string;
  description: string;
  category: InitiativeCategory;
  coverImageUrl?: string;
  status: InitiativeStatus;
  supporters: Types.ObjectId[];
  contributors: Types.ObjectId[];
  supporterCount: number;
  commentCount: number;
  targetDate?: Date;
  goal?: string;
  tags?: string[];
  membersNeeded?: number;
  budgetNote?: string;
  rulesAcceptedAt?: Date;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  rejectionReason?: string;
  completedAt?: Date;
  completionSummary?: string;
  createdAt: Date;
  updatedAt: Date;
  toClientJSON(viewerId?: string): Record<string, unknown>;
}

const initiativeSchema = new Schema<IInitiative>(
  {
    communityId: { type: Schema.Types.ObjectId, ref: 'Community', required: true, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: '', maxlength: 5000 },
    category: {
      type: String,
      enum: ['event', 'volunteer', 'product', 'social', 'other'],
      default: 'other',
    },
    coverImageUrl: String,
    status: {
      type: String,
      enum: ['draft', 'submitted', 'under_review', 'approved', 'active', 'completed', 'rejected'],
      default: 'draft',
    },
    supporters: { type: [Schema.Types.ObjectId], ref: 'User', default: [] },
    contributors: { type: [Schema.Types.ObjectId], ref: 'User', default: [] },
    supporterCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
    targetDate: Date,
    goal: { type: String, maxlength: 300 },
    tags: { type: [String], default: [] },
    membersNeeded: { type: Number, min: 0, max: 10_000 },
    budgetNote: { type: String, maxlength: 500 },
    rulesAcceptedAt: Date,
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    rejectionReason: String,
    completedAt: Date,
    completionSummary: String,
  },
  { timestamps: true },
);

initiativeSchema.index({ communityId: 1, status: 1, updatedAt: -1 });

initiativeSchema.methods.toClientJSON = function toClientJSON(this: IInitiative, viewerId?: string) {
  const isSupporting = viewerId
    ? this.supporters.some((s) => String(s) === viewerId)
    : false;
  const isContributor = viewerId
    ? this.contributors.some((c) => String(c) === viewerId)
    : false;
  return {
    id: String(this._id),
    communityId: String(this.communityId),
    authorId: String(this.authorId),
    title: this.title,
    description: this.description,
    category: this.category,
    coverImageUrl: this.coverImageUrl,
    status: this.status,
    supporterCount: this.supporterCount,
    commentCount: this.commentCount,
    contributorIds: this.contributors.map(String),
    targetDate: this.targetDate,
    goal: this.goal,
    tags: this.tags,
    membersNeeded: this.membersNeeded,
    budgetNote: this.budgetNote,
    completedAt: this.completedAt,
    completionSummary: this.completionSummary,
    rejectionReason: this.rejectionReason,
    viewer: viewerId ? { isSupporting, isContributor } : undefined,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Initiative: Model<IInitiative> = mongoose.model<IInitiative>(
  'Initiative',
  initiativeSchema,
);
export default Initiative;
