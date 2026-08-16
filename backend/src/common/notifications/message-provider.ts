import { Injectable, Logger } from '@nestjs/common';

/**
 * Vendor-agnostic SMS/WhatsApp text delivery for general notifications
 * (receipts, reminders, news). Deliberately separate from auth's SmsProvider
 * — OTP delivery has different security/rate-limit needs than a receipt or
 * reminder, even if a real deployment happens to route both through the
 * same underlying vendor account.
 */
export const MESSAGE_PROVIDER = Symbol('MESSAGE_PROVIDER');

export interface MessageProvider {
  sendMessage(phone: string, text: string): Promise<void>;
}

/** Dev/test default: logs instead of sending a real message. Selected via MESSAGE_PROVIDER=mock in .env. */
@Injectable()
export class MockMessageProvider implements MessageProvider {
  private readonly logger = new Logger(MockMessageProvider.name);

  async sendMessage(phone: string, text: string): Promise<void> {
    this.logger.log(`[mock message] to ${phone}: ${text}`);
  }
}
