import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { AdminRole, AuditAction, JurisdictionTree, JurisdictionType } from '../../../generated/prisma/enums';
import { CreateAdminScopeDto } from './dto/create-admin-scope.dto';

/**
 * Which JurisdictionUnit types (administrative tree only — CallerScopeService
 * resolves a single path, so a scoped admin can only ever cover one tree;
 * see AdminScope's own schema comment) a given role may be scoped to.
 * LOCAL_ADMIN reuses the same "everything below district" band
 * bearers.service.ts's HOME_ADMINISTRATIVE_TYPES already groups.
 */
const ROLE_ALLOWED_UNIT_TYPES: Partial<Record<AdminRole, JurisdictionType[]>> = {
  [AdminRole.STATE_ADMIN]: [JurisdictionType.STATE],
  [AdminRole.DISTRICT_ADMIN]: [JurisdictionType.DISTRICT],
  [AdminRole.LOCAL_ADMIN]: [
    JurisdictionType.BLOCK,
    JurisdictionType.MUNICIPALITY,
    JurisdictionType.TOWN_PANCHAYAT,
    JurisdictionType.VILLAGE,
  ],
};

@Injectable()
export class AdminScopesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  list() {
    return this.prisma.adminScope.findMany({
      include: { adminBearer: true, scopeJurisdictionUnit: true },
      orderBy: { adminBearer: { fullName: 'asc' } },
    });
  }

  me(bearerId: string) {
    return this.prisma.adminScope.findUnique({
      where: { adminBearerId: bearerId },
      include: { scopeJurisdictionUnit: true },
    });
  }

  async grant(dto: CreateAdminScopeDto, actorBearerId: string) {
    await this.assertBearerExists(dto.bearerId);
    await this.assertRoleScopeConsistency(dto.role, dto.scopeJurisdictionUnitId);

    const before = await this.prisma.adminScope.findUnique({ where: { adminBearerId: dto.bearerId } });
    const scope = await this.prisma.adminScope.upsert({
      where: { adminBearerId: dto.bearerId },
      create: {
        adminBearerId: dto.bearerId,
        role: dto.role,
        scopeJurisdictionUnitId: dto.scopeJurisdictionUnitId ?? null,
      },
      update: {
        role: dto.role,
        scopeJurisdictionUnitId: dto.scopeJurisdictionUnitId ?? null,
      },
    });

    await this.auditLog.record({
      actorBearerId,
      action: AuditAction.ADMIN_SCOPE_GRANTED,
      targetType: 'AdminScope',
      targetId: scope.adminBearerId,
      metadata: {
        from: before ? { role: before.role, scopeJurisdictionUnitId: before.scopeJurisdictionUnitId } : null,
        to: { role: scope.role, scopeJurisdictionUnitId: scope.scopeJurisdictionUnitId },
      },
    });

    return scope;
  }

  async revoke(bearerId: string, actorBearerId: string) {
    const existing = await this.prisma.adminScope.findUnique({ where: { adminBearerId: bearerId } });
    if (!existing) {
      throw new NotFoundException({ error: 'ADMIN_SCOPE_NOT_FOUND', message: 'This bearer has no admin role' });
    }

    if (bearerId === actorBearerId && existing.role === AdminRole.SUPER_ADMIN) {
      throw new BadRequestException({
        error: 'CANNOT_REVOKE_SELF',
        message: 'You cannot revoke your own Super Admin role — have another Super Admin do it',
      });
    }

    await this.prisma.adminScope.delete({ where: { adminBearerId: bearerId } });

    await this.auditLog.record({
      actorBearerId,
      action: AuditAction.ADMIN_SCOPE_REVOKED,
      targetType: 'AdminScope',
      targetId: bearerId,
      metadata: { role: existing.role, scopeJurisdictionUnitId: existing.scopeJurisdictionUnitId },
    });
  }

  private async assertBearerExists(bearerId: string): Promise<void> {
    const bearer = await this.prisma.bearer.findUnique({ where: { id: bearerId } });
    if (!bearer) {
      throw new NotFoundException({ error: 'BEARER_NOT_FOUND', message: 'This bearer does not exist' });
    }
  }

  private async assertRoleScopeConsistency(role: AdminRole, scopeJurisdictionUnitId?: string): Promise<void> {
    if (role === AdminRole.SUPER_ADMIN) {
      if (scopeJurisdictionUnitId) {
        throw new BadRequestException({
          error: 'SUPER_ADMIN_MUST_BE_GLOBAL',
          message: 'Super Admin cannot have a jurisdiction scope',
        });
      }
      return;
    }

    if (!scopeJurisdictionUnitId) {
      throw new BadRequestException({ error: 'SCOPE_REQUIRED', message: `${role} requires a jurisdiction unit` });
    }

    const unit = await this.prisma.jurisdictionUnit.findUnique({ where: { id: scopeJurisdictionUnitId } });
    const allowed = ROLE_ALLOWED_UNIT_TYPES[role]!;
    if (!unit || unit.tree !== JurisdictionTree.ADMINISTRATIVE || !allowed.includes(unit.type)) {
      throw new BadRequestException({
        error: 'INVALID_SCOPE_TYPE',
        message: `${role} must be scoped to one of: ${allowed.join(', ')}`,
      });
    }
  }
}
