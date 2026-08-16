import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { JwtStrategy } from './jwt.strategy';
import { MockSmsProvider, SMS_PROVIDER } from './sms-provider';

@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    OtpService,
    JwtStrategy,
    {
      // SMS_PROVIDER=mock is the only implementation for now; a real
      // MSG91/Twilio provider slots in here later without touching
      // AuthService (specs/001.../research.md §5).
      provide: SMS_PROVIDER,
      useClass: MockSmsProvider,
    },
  ],
  exports: [AuthService, OtpService],
})
export class AuthModule {}
