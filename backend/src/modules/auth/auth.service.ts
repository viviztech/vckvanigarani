import { Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { BearerStatus } from '../../../generated/prisma/enums';
import { OtpService } from './otp.service';
import { SMS_PROVIDER, SmsProvider } from './sms-provider';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly otp: OtpService,
    private readonly jwt: JwtService,
    @Inject(SMS_PROVIDER) private readonly smsProvider: SmsProvider,
  ) {}

  /**
   * Always accepted, regardless of whether `phone` matches a Bearer — the
   * response must not leak which numbers are registered (contracts/api.md).
   */
  async requestOtp(phone: string): Promise<void> {
    const code = this.otp.generate(phone);
    await this.smsProvider.sendOtp(phone, code);
  }

  /**
   * FR-016 / Constitution Principle V: OTP login authenticates an existing
   * Bearer, it never creates one. A phone with no matching ACTIVE Bearer is
   * rejected, not silently turned into a new account.
   */
  async verifyOtp(phone: string, code: string): Promise<TokenPair> {
    if (!this.otp.verify(phone, code)) {
      throw new UnauthorizedException({ error: 'INVALID_OTP', message: 'Incorrect or expired code' });
    }

    const bearer = await this.prisma.bearer.findUnique({ where: { phone } });
    if (!bearer || bearer.status !== BearerStatus.ACTIVE) {
      throw new NotFoundException({
        error: 'BEARER_NOT_FOUND',
        message: 'No account found for this number. Contact your admin to be added.',
      });
    }

    return this.issueTokens(bearer.id);
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    let bearerId: string;
    try {
      const payload = this.jwt.verify<{ sub: string }>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-change-me',
      });
      bearerId = payload.sub;
    } catch {
      throw new UnauthorizedException({ error: 'INVALID_REFRESH_TOKEN', message: 'Please log in again' });
    }

    const accessToken = this.signAccessToken(bearerId);
    return { accessToken };
  }

  private issueTokens(bearerId: string): TokenPair {
    return {
      accessToken: this.signAccessToken(bearerId),
      refreshToken: this.jwt.sign(
        { sub: bearerId },
        {
          secret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-change-me',
          expiresIn: (process.env.JWT_REFRESH_TTL ?? '30d') as SignOptionsExpiresIn,
        },
      ),
    };
  }

  private signAccessToken(bearerId: string): string {
    return this.jwt.sign(
      { sub: bearerId },
      {
        secret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret-change-me',
        expiresIn: (process.env.JWT_ACCESS_TTL ?? '15m') as SignOptionsExpiresIn,
      },
    );
  }
}

// @nestjs/jwt's SignOptions.expiresIn only accepts a template-literal string
// union (e.g. "15m") or a number of seconds, not a general `string` — env
// vars are always `string`, so this narrows the type at the one place it's
// read rather than loosening it everywhere.
type SignOptionsExpiresIn = Parameters<JwtService['sign']>[1] extends { expiresIn?: infer E }
  ? E
  : never;
