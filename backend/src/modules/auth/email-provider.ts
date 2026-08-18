import { Injectable, Logger } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';

/**
 * Vendor-agnostic OTP email delivery — auth logic never talks to an SMTP/API
 * client directly, so swapping providers (SES, SendGrid, ...) later only
 * means implementing this interface.
 */
export const EMAIL_PROVIDER = Symbol('EMAIL_PROVIDER');

export interface EmailProvider {
  sendOtp(email: string, code: string): Promise<void>;
}

/**
 * Dev/test default: logs the OTP instead of sending a real email. Selected
 * via EMAIL_PROVIDER=mock in .env (see auth.module.ts).
 */
@Injectable()
export class MockEmailProvider implements EmailProvider {
  private readonly logger = new Logger(MockEmailProvider.name);

  async sendOtp(email: string, code: string): Promise<void> {
    this.logger.log(`[mock email] OTP for ${email}: ${code}`);
  }
}

/**
 * Generic SMTP delivery via nodemailer — works with any SMTP-speaking
 * provider (SES, SendGrid, Mailgun, Gmail, ...) without a vendor-specific
 * SDK. Selected via EMAIL_PROVIDER=smtp.
 */
@Injectable()
export class SmtpEmailProvider implements EmailProvider {
  private readonly transporter: Transporter;
  private readonly fromAddress: string;

  constructor() {
    this.transporter = createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    this.fromAddress = process.env.SMTP_FROM ?? 'no-reply@vckvanigarani.com';
  }

  async sendOtp(email: string, code: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.fromAddress,
      to: email,
      subject: `${code} — உங்கள் சரிபார்ப்புக் குறியீடு (Vanigar Ani)`,
      text: `Your Vanigar Ani verification code is ${code}. It expires in 5 minutes.`,
    });
  }
}
