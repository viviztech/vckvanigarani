import { Injectable, Logger } from '@nestjs/common';

/**
 * Vendor-agnostic SMS delivery. Swap the provider (MSG91, Twilio, ...) by
 * implementing this interface — auth logic never talks to a vendor SDK
 * directly. See specs/001-bearer-hierarchy-register/research.md §5.
 */
export const SMS_PROVIDER = Symbol('SMS_PROVIDER');

export interface SmsProvider {
  sendOtp(phone: string, code: string): Promise<void>;
}

/**
 * Dev/test default: logs the OTP instead of sending a real SMS. Selected via
 * SMS_PROVIDER=mock in .env (see auth.module.ts).
 */
@Injectable()
export class MockSmsProvider implements SmsProvider {
  private readonly logger = new Logger(MockSmsProvider.name);

  async sendOtp(phone: string, code: string): Promise<void> {
    this.logger.log(`[mock SMS] OTP for ${phone}: ${code}`);
  }
}
