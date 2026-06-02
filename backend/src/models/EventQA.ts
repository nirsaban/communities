import mongoose, { Schema, Document, Types, Model } from 'mongoose';

export interface IEventQA extends Document {
  _id: Types.ObjectId;
  eventId: Types.ObjectId;
  communityId: Types.ObjectId;
  userId: Types.ObjectId;
  question: string;
  upvoteUserIds: Types.ObjectId[];
  pinned: boolean;
  resolvedAt?: Date | null;
  answer?: {
    body: string;
    answeredByUserId: Types.ObjectId;
    answeredAt: Date;
  } | null;
  createdAt: Date;
  updatedAt: Date;
  toClientJSON(viewerId?: string | null): Record<string, unknown>;
}

const eventQASchema = new Schema<IEventQA>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    communityId: { type: Schema.Types.ObjectId, ref: 'Community', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    question: { type: String, required: true, maxlength: 1000 },
    upvoteUserIds: { type: [Schema.Types.ObjectId], ref: 'User', default: [], index: true },
    pinned: { type: Boolean, default: false, index: true },
    resolvedAt: { type: Date, default: null },
    answer: {
      type: new Schema(
        {
          body: { type: String, required: true, maxlength: 4000 },
          answeredByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
          answeredAt: { type: Date, required: true },
        },
        { _id: false },
      ),
      default: null,
    },
  },
  { timestamps: true },
);

eventQASchema.index({ eventId: 1, pinned: -1, createdAt: -1 });

eventQASchema.methods.toClientJSON = function toClientJSON(
  this: IEventQA,
  viewerId?: string | null,
) {
  return {
    id: String(this._id),
    eventId: String(this.eventId),
    communityId: String(this.communityId),
    userId: String(this.userId),
    question: this.question,
    upvoteCount: this.upvoteUserIds.length,
    upvoted: viewerId ? this.upvoteUserIds.some((id) => String(id) === viewerId) : false,
    pinned: this.pinned,
    resolved: !!this.resolvedAt,
    resolvedAt: this.resolvedAt,
    answer: this.answer
      ? {
          body: this.answer.body,
          answeredByUserId: String(this.answer.answeredByUserId),
          answeredAt: this.answer.answeredAt,
        }
      : null,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const EventQA: Model<IEventQA> = mongoose.model<IEventQA>('EventQA', eventQASchema);
export default EventQA;
