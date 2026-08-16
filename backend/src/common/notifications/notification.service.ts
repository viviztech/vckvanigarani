import { Inject, Injectable, Logger } from '@nestjs/common';
import { PUSH_PROVIDER, PushProvider } from './push-provider';
import { MESSAGE_PROVIDER, MessageProvider } from './message-provider';

export interface NotifyInput {
  bearerId: string;
  phone: string;
  title: string;
  body: string;
}

/**
 * Single place every feature calls to notify a bearer — push + SMS/WhatsApp
 * together, per the constitution's platform constraints. Reused by feature
 * 002 (receipts, reminders) and feature 003 (news fan-out).
 *
 * Best-effort: a delivery failure is logged, not thrown — the calling
 * operation (e.g. verifying a payment) must not fail because a
 * notification vendor is down.
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @Inject(PUSH_PROVIDER) private readonly push: PushProvider,
    @Inject(MESSAGE_PROVIDER) private readonly message: MessageProvider,
  ) {}

  async notify(input: NotifyInput): Promise<void> {
    const results = await Promise.allSettled([
      this.push.sendPush(input.bearerId, { title: input.title, body: input.body }),
      this.message.sendMessage(input.phone, `${input.title}\n${input.body}`),
    ]);

    for (const result of results) {
      if (result.status === 'rejected') {
        this.logger.warn(`Notification delivery failed for bearer ${input.bearerId}: ${result.reason}`);
      }
    }
  }
}
