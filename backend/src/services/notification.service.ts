import type { Types } from 'mongoose';
import { Notification, INotification } from '../models/Notification';
import logger from '../config/logger';

/**
 * Notification service — canonical type strings.
 *
 * Every type string is dotted (`namespace.event`). The web Inbox screen buckets
 * notifications by their leading namespace, so adding a new type under an
 * existing namespace requires no client change. New namespaces should be added
 * to InboxScreen TYPE_GROUP / TYPE_ICON tables.
 *
 * Canonical types (keep this list in sync when you add an emit):
 *
 *   event.*
 *     event.published                — admin published a new event (member feed)
 *     event_broadcast                — legacy single-key broadcast (kept until clients migrate)
 *
 *   recap.*
 *     recap.published                — host published a recap (member: attendees only)
 *
 *   rsvp.*
 *     rsvp.confirmed                 — paid event confirmed
 *
 *   waitlist.*
 *     waitlist.promoted              — waitlist seat opened
 *
 *   qa.*
 *     qa.answered                    — host answered your question
 *     qa.pinned                      — host pinned your question
 *
 *   payment.*
 *     payment.succeeded              — paid event ticket settled
 *     payment.failed                 — checkout/recurring attempt failed
 *
 *   refund.*
 *     refund.received                — full or partial refund landed
 *
 *   subscription.*
 *     subscription.renewed           — recurring charge succeeded
 *     subscription.past_due          — three consecutive failures
 *     subscription.cancelled         — recurring cancelled (gateway confirmed)
 *     subscription.cancel_requested  — member requested cancel (period-end)
 *
 *   role.*
 *     role.event_manager.assigned    — user added to event managers
 *
 *   application.*
 *     application.approved           — community admin approved join request
 *     application.rejected           — community admin rejected join request
 *
 *   community.*
 *     community.suspended            — super suspended this community
 *     community.restored             — super restored this community
 *
 *   post.* / initiative.*            — community-content namespaces (existing)
 *   info                             — generic fallback (system)
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

/**
 * Fan-out helper for cases where a single event triggers notifications to many
 * users (e.g., recap published → every attendee, community suspended → every
 * member). Errors per-recipient are logged but do not abort the batch.
 */
export async function fanOut(
  inputs: NotificationInput[],
): Promise<{ delivered: number; failed: number }> {
  const svc = getNotificationService();
  let delivered = 0;
  let failed = 0;
  for (const input of inputs) {
    try {
      await svc.send(input);
      delivered += 1;
    } catch (err) {
      failed += 1;
      logger.warn({
        msg: 'notification.fanOut.failed',
        type: input.type,
        userId: String(input.userId),
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return { delivered, failed };
}
