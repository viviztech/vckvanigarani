import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OtpService } from '../auth/otp.service';
import { JurisdictionTree, JurisdictionType } from '../../../generated/prisma/enums';
import { SubmitRegistrationDto } from './dto/submit-registration.dto';

@Injectable()
export class PublicRegistrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly otp: OtpService,
  ) {}

  /**
   * Constitution Principle V: this never creates a Bearer — only a
   * PendingRegistration, reviewed by an admin (pending-registrations
   * module). OTP is checked directly against OtpService, not
   * AuthService.verifyOtp, which requires an existing Bearer and would
   * reject every public submission by design.
   */
  async submit(dto: SubmitRegistrationDto) {
    if (!this.otp.verify(dto.phone, dto.code)) {
      throw new UnauthorizedException({ error: 'INVALID_OTP', message: 'Incorrect or expired code' });
    }

    const district = await this.prisma.jurisdictionUnit.findUnique({ where: { id: dto.homeDistrictId } });
    if (!district || district.tree !== JurisdictionTree.ADMINISTRATIVE || district.type !== JurisdictionType.DISTRICT) {
      throw new BadRequestException({ error: 'INVALID_HOME_DISTRICT', message: 'homeDistrictId must be a real district' });
    }

    const { code: _code, ...fields } = dto;
    return this.prisma.pendingRegistration.create({ data: fields });
  }
}
