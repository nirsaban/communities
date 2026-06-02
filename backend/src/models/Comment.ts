import mongoose, { Schema, Document, Types, Model } from 'mongoose';

export type CommentParentType = 'post' | 'initiative' | 'event_qa';

export interface IComment extends Document {
  _id: Types.ObjectId;
  parentType: CommentParentType;
  parentId: Types.ObjectId;
  communityId: Types.ObjectId;
  authorId: Types.ObjectId;
  replyToId?: Types.ObjectId;
  body: string;
  isHidden: boolean;
  createdAt: Date;
  updatedAt: Date;
  toClientJSON(): Record<string, unknown>;
}

const commentSchema = new Schema<IComment>(
  {
    parentType: {
      type: String,
      enum: ['post', 'initiative', 'event_qa'],
      required: true,
    },
    parentId: { type: Schema.Types.ObjectId, required: true },
    communityId: { type: Schema.Types.ObjectId, ref: 'Community', required: true, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    replyToId: { type: Schema.Types.ObjectId, ref: 'Comment' },
    body: { type: String, required: true, maxlength: 5_000 },
    isHidden: { type: Boolean, default: false },
  },
  { timestamps: true },
);

commentSchema.index({ parentType: 1, parentId: 1, createdAt: 1 });

commentSchema.methods.toClientJSON = function toClientJSON(this: IComment) {
  return {
    id: String(this._id),
    parentType: this.parentType,
    parentId: String(this.parentId),
    communityId: String(this.communityId),
    authorId: String(this.authorId),
    replyToId: this.replyToId ? String(this.replyToId) : null,
    body: this.body,
    isHidden: this.isHidden,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Comment: Model<IComment> = mongoose.model<IComment>('Comment', commentSchema);
export default Comment;
