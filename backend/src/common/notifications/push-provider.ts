import { Injectable, Logger } from '@nestjs/common';

/** Vendor-agnostic push delivery (FCM in production) — see sms-provider.ts for the same pattern. */
export const PUSH_PROVIDER = Symbol('PUSH_PROVIDER');

export interface PushPayload {
  title: string;
  body: string;
}

export interface PushProvider {
  sendPush(bearerId: string, payload: PushPayload): Promise<void>;
}

/** Dev/test default: logs instead of calling FCM. Selected via PUSH_PROVIDER=mock in .env. */
@Injectable()
export class MockPushProvider implements PushProvider {
  private readonly logger = new Logger(MockPushProvider.name);

  async sendPush(bearerId: string, payload: PushPayload): Promise<void> {
    this.logger.log(`[mock push] to ${bearerId}: ${payload.title} — ${payload.body}`);
  }
}
