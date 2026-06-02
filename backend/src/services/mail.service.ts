import logger from '../config/logger';
import env from '../config/env';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  template?: string;
  data?: Record<string, unknown>;
}

export interface MailService {
  send(msg: MailMessage): Promise<void>;
}

class ConsoleMailService implements MailService {
  async send(msg: MailMessage): Promise<void> {
    // Dev: print full message to logs with a [mail] prefix.
    logger.info({
      msg: '[mail]',
      from: env.MAIL_FROM,
      to: msg.to,
      subject: msg.subject,
      template: msg.template,
      data: msg.data,
      text: msg.text,
    });
  }
}

let instance: MailService | null = null;

export function getMailService(): MailService {
  if (instance) return instance;
  switch (env.MAIL_DRIVER) {
    case 'console':
    default:
      instance = new ConsoleMailService();
  }
  return instance;
}

// Test-only reset.
export function _resetMailService(svc: MailService | null): void {
  instance = svc;
}
