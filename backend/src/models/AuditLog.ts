import mongoose, { Schema, Document, Types, Model } from 'mongoose';

export interface IAuditLog extends Document {
  _id: Types.ObjectId;
  actorId?: Types.ObjectId;
  actorRole?: string;
  communityId?: Types.ObjectId | null;
  action: string;
  targetType?: string;
  targetId?: Types.ObjectId;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>({
  actorId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  actorRole: String,
  communityId: { type: Schema.Types.ObjectId, ref: 'Community', default: null, index: true },
  action: { type: String, required: true, index: true },
  targetType: String,
  targetId: Schema.Types.ObjectId,
  metadata: { type: Schema.Types.Mixed, default: {} },
  ipAddress: String,
  userAgent: String,
  createdAt: { type: Date, default: Date.now },
});

// 1-year retention per PRD 14 §3.14.
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 365 });
auditLogSchema.index({ communityId: 1, createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

export const AuditLog: Model<IAuditLog> = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
export default AuditLog;
