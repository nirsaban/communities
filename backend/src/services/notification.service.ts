import type { Types } from 'mongoose';
import { Notification, INotification } from '../models/Notification';
import logger from '../config/logger';

/**
 * Sender abstraction. Console-stub in dev / tests; FCM + email in production
 * (wired in P7). The interface deliberately accepts only the minimum shape so we
 * can substitute providers without changing call-sites.
 */
export interface NotificationInput {
  userId: Types.ObjectId | string;
  communityId?: Types.ObjectId | string | null;
  type: string;
  title: string;
  body?: string;
  payload?: Record<string, unknown>;
}

export interface NotificationService {
  send(input: NotificationInput): Promise<INotification>;
}

class ConsoleNotificationService implements NotificationService {
  async send(input: NotificationInput): Promise<INotification> {
    const doc = await Notification.create({
      userId: input.userId,
      communityId: input.communityId ?? null,
      type: input.type,
      title: input.title,
      body: input.body ?? '',
      payload: input.payload ?? {},
    });
    logger.info({
      msg: '[notify]',
      type: input.type,
      userId: String(input.userId),
      title: input.title,
      payload: input.payload,
    });
    return doc;
  }
}

let instance: NotificationService | null = null;

export function getNotificationService(): NotificationService {
  if (!instance) instance = new ConsoleNotificationService();
  return instance;
}

export function _resetNotificationService(svc: NotificationService | null): void {
  instance = svc;
}
