import mongoose, { Schema, Document, Types, Model } from 'mongoose';

export type PostType = 'announcement' | 'discussion' | 'update';

export interface IPost extends Document {
  _id: Types.ObjectId;
  communityId: Types.ObjectId;
  authorId: Types.ObjectId;
  type: PostType;
  title?: string;
  body: string;
  imageUrls: string[];
  isPinned: boolean;
  isLocked: boolean;
  hidden: boolean;
  moderatedAt?: Date | null;
  moderatedByUserId?: Types.ObjectId | null;
  commentCount: number;
  createdAt: Date;
  updatedAt: Date;
  toClientJSON(): Record<string, unknown>;
}

const postSchema = new Schema<IPost>(
  {
    communityId: { type: Schema.Types.ObjectId, ref: 'Community', required: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['announcement', 'discussion', 'update'],
      default: 'discussion',
    },
    title: String,
    body: { type: String, required: true, maxlength: 10_000 },
    imageUrls: { type: [String], default: [] },
    isPinned: { type: Boolean, default: false },
    isLocked: { type: Boolean, default: false },
    hidden: { type: Boolean, default: false, index: true },
    moderatedAt: { type: Date, default: null },
    moderatedByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    commentCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

postSchema.index({ communityId: 1, isPinned: -1, createdAt: -1 });

postSchema.methods.toClientJSON = function toClientJSON(this: IPost) {
  return {
    id: String(this._id),
    communityId: String(this.communityId),
    authorId: String(this.authorId),
    type: this.type,
    title: this.title,
    body: this.body,
    imageUrls: this.imageUrls,
    isPinned: this.isPinned,
    isLocked: this.isLocked,
    hidden: this.hidden,
    commentCount: this.commentCount,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Post: Model<IPost> = mongoose.model<IPost>('Post', postSchema);
export default Post;
