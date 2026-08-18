import { Injectable } from '@nestjs/common';
import { randomInt } from 'node:crypto';

interface OtpEntry {
  code: string;
  expiresAt: number;
}

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_LENGTH = 6;

/**
 * In-memory OTP store, keyed by whatever identifier the code was issued for
 * (currently email). Fine for a single backend instance; swap for a shared
 * cache (Redis) before running more than one API instance, since a restart
 * or a second instance won't see codes issued elsewhere.
 */
@Injectable()
export class OtpService {
  private readonly codesByIdentifier = new Map<string, OtpEntry>();

  generate(identifier: string): string {
    const code = randomInt(0, 10 ** OTP_LENGTH).toString().padStart(OTP_LENGTH, '0');
    this.codesByIdentifier.set(identifier, { code, expiresAt: Date.now() + OTP_TTL_MS });
    return code;
  }

  verify(identifier: string, code: string): boolean {
    const entry = this.codesByIdentifier.get(identifier);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.codesByIdentifier.delete(identifier);
      return false;
    }
    const valid = entry.code === code;
    if (valid) this.codesByIdentifier.delete(identifier); // one-time use
    return valid;
  }
}
