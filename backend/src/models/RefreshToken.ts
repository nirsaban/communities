import mongoose, { Schema, Document, Types, Model } from 'mongoose';

export interface IRefreshToken extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  revokedAt?: Date;
  replacedByTokenId?: Types.ObjectId;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // tokenHash = SHA-256 of the JWT's tokenId claim. Lookup-friendly, leak-safe.
    tokenHash: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true },
    revokedAt: Date,
    replacedByTokenId: { type: Schema.Types.ObjectId, ref: 'RefreshToken' },
    ipAddress: String,
    userAgent: String,
  },
  { timestamps: true },
);

// TTL — Mongo prunes after expiry.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken: Model<IRefreshToken> = mongoose.model<IRefreshToken>(
  'RefreshToken',
  refreshTokenSchema,
);
export default RefreshToken;
