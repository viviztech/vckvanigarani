import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { CallerScope } from '../../common/guards/caller-scope.service';
import { JurisdictionPathService } from '../jurisdictions/jurisdiction-path.util';
import { BearersService } from '../bearers/bearers.service';
import { AuditAction, PendingRegistrationStatus } from '../../../generated/prisma/enums';
import { RejectRegistrationDto } from './dto/reject-registration.dto';

@Injectable()
export class PendingRegistrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bearers: BearersService,
    private readonly auditLog: AuditLogService,
  ) {}

  /** Scoped like BearersService.list(): GLOBAL sees everything, a scoped admin sees only registrations whose home district falls in their subtree. */
  async list(scope: CallerScope) {
    if (!scope) return [];

    const registrations = await this.prisma.pendingRegistration.findMany({
      include: { homeDistrict: true },
      orderBy: { submittedAt: 'desc' },
    });

    if (scope === 'GLOBAL') return registrations;
    return registrations.filter((r) => JurisdictionPathService.isAncestorOrSelf(scope.path, r.homeDistrict.path));
  }

  /**
   * The actual moment a Bearer (and its membership ID) gets created —
   * reuses the same BearersService.create() an admin's "New bearer" form
   * calls, so phone-upsert and district-based numbering behave identically
   * either way (Constitution Principle V: an admin action is still what
   * creates the Bearer).
   */
  async approve(id: string, actorBearerId: string) {
    const registration = await this.loadPending(id);

    const { bearer } = await this.bearers.create({
      fullName: registration.fullName,
      fatherOrHusbandName: registration.fatherOrHusbandName,
      phone: registration.phone,
      email: registration.email ?? undefined,
      address: registration.address,
      habitationOrStreet: registration.habitationOrStreet,
      idProofRef: registration.idProofRef,
      photoUrl: registration.photoUrl ?? undefined,
      homeDistrictId: registration.homeDistrictId,
      homeAdministrativeUnitId: registration.homeAdministrativeUnitId ?? undefined,
      homeElectoralUnitId: registration.homeElectoralUnitId ?? undefined,
    });

    const updated = await this.prisma.pendingRegistration.update({
      where: { id },
      data: {
        status: PendingRegistrationStatus.APPROVED,
        reviewedAt: new Date(),
        reviewedByBearerId: actorBearerId,
        resultingBearerId: bearer.id,
      },
    });

    await this.auditLog.record({
      actorBearerId,
      action: AuditAction.REGISTRATION_APPROVED,
      targetType: 'PendingRegistration',
      targetId: id,
      metadata: { bearerId: bearer.id, membershipNo: bearer.membershipNo },
    });

    return { registration: updated, bearerId: bearer.id, membershipNo: bearer.membershipNo };
  }

  async reject(id: string, dto: RejectRegistrationDto, actorBearerId: string) {
    await this.loadPending(id);

    const updated = await this.prisma.pendingRegistration.update({
      where: { id },
      data: {
        status: PendingRegistrationStatus.REJECTED,
        reviewedAt: new Date(),
        reviewedByBearerId: actorBearerId,
        rejectionReason: dto.reason,
      },
    });

    await this.auditLog.record({
      actorBearerId,
      action: AuditAction.REGISTRATION_REJECTED,
      targetType: 'PendingRegistration',
      targetId: id,
      metadata: { reason: dto.reason },
    });

    return updated;
  }

  private async loadPending(id: string) {
    const registration = await this.prisma.pendingRegistration.findUnique({ where: { id } });
    if (!registration) {
      throw new NotFoundException({ error: 'REGISTRATION_NOT_FOUND', message: 'Registration does not exist' });
    }
    if (registration.status !== PendingRegistrationStatus.PENDING) {
      throw new BadRequestException({ error: 'REGISTRATION_ALREADY_REVIEWED', message: 'This registration has already been reviewed' });
    }
    return registration;
  }
}
