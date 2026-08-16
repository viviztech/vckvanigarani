import { Injectable } from '@nestjs/common';
import { randomInt } from 'node:crypto';

interface OtpEntry {
  code: string;
  expiresAt: number;
}

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_LENGTH = 6;

/**
 * In-memory OTP store. Fine for a single backend instance; swap for a shared
 * cache (Redis) before running more than one API instance, since a restart
 * or a second instance won't see codes issued elsewhere.
 */
@Injectable()
export class OtpService {
  private readonly codesByPhone = new Map<string, OtpEntry>();

  generate(phone: string): string {
    const code = randomInt(0, 10 ** OTP_LENGTH).toString().padStart(OTP_LENGTH, '0');
    this.codesByPhone.set(phone, { code, expiresAt: Date.now() + OTP_TTL_MS });
    return code;
  }

  verify(phone: string, code: string): boolean {
    const entry = this.codesByPhone.get(phone);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.codesByPhone.delete(phone);
      return false;
    }
    const valid = entry.code === code;
    if (valid) this.codesByPhone.delete(phone); // one-time use
    return valid;
  }
}
