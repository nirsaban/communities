import type { Request } from 'express';
import type { Types } from 'mongoose';
import { AuditLog } from '../models/AuditLog';
import logger from '../config/logger';

export interface AuditEntry {
  action: string;
  actorId?: Types.ObjectId | string;
  actorRole?: string;
  communityId?: Types.ObjectId | string | null;
  targetType?: string;
  targetId?: Types.ObjectId | string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function audit(entry: AuditEntry): Promise<void> {
  try {
    await AuditLog.create({
      ...entry,
      actorId: entry.actorId as Types.ObjectId | undefined,
      communityId: (entry.communityId ?? null) as Types.ObjectId | null,
      targetId: entry.targetId as Types.ObjectId | undefined,
    });
  } catch (err) {
    // Fire-and-forget — audit failure must never break the user action.
    logger.warn({
      msg: 'audit.write.failed',
      err: err instanceof Error ? err.message : String(err),
      entry,
    });
  }
}

export function auditFromReq(
  req: Request,
  entry: Omit<AuditEntry, 'ipAddress' | 'userAgent' | 'actorId' | 'actorRole'>,
): Promise<void> {
  return audit({
    ...entry,
    actorId: req.user?._id,
    actorRole: req.membership?.role || req.user?.globalRole,
    ipAddress: req.ip,
    userAgent: req.get('user-agent') || undefined,
  });
}
