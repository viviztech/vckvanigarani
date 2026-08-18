import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { JwtStrategy } from './jwt.strategy';
import { EMAIL_PROVIDER, MockEmailProvider, SmtpEmailProvider } from './email-provider';

@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    OtpService,
    JwtStrategy,
    {
      // EMAIL_PROVIDER=mock (default, dev/test) logs the code instead of
      // sending it; EMAIL_PROVIDER=smtp sends via the SMTP_* settings.
      provide: EMAIL_PROVIDER,
      useClass: process.env.EMAIL_PROVIDER === 'smtp' ? SmtpEmailProvider : MockEmailProvider,
    },
  ],
  exports: [AuthService, OtpService],
})
export class AuthModule {}
