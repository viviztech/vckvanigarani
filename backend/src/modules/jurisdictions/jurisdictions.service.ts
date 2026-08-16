import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { CallerScope } from '../../common/guards/caller-scope.service';
import { AuditAction, JurisdictionTree } from '../../../generated/prisma/enums';
import { JurisdictionPathService } from './jurisdiction-path.util';
import { CreateJurisdictionDto } from './dto/create-jurisdiction.dto';
import { UpdateJurisdictionDto } from './dto/update-jurisdiction.dto';

@Injectable()
export class JurisdictionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paths: JurisdictionPathService,
    private readonly auditLog: AuditLogService,
  ) {}

  /**
   * Non-Super-Admin callers only see units within their own subtree (FR-010
   * applied to a read, not just writes) — `path` has no native "starts with"
   * filter in Postgres array columns via Prisma, so the tree/parent filters
   * run in the DB and the subtree filter runs in memory. Fine at this
   * dataset size (hundreds to low thousands of units); revisit if it grows.
   */
  async list(filters: { tree?: JurisdictionTree; parentId?: string }, callerScope: CallerScope) {
    const candidates = await this.prisma.jurisdictionUnit.findMany({
      where: { tree: filters.tree, parentId: filters.parentId },
      orderBy: { name: 'asc' },
    });
    if (callerScope === 'GLOBAL') return candidates;
    if (!callerScope) return [];
    return candidates.filter((unit) => JurisdictionPathService.isAncestorOrSelf(callerScope.path, unit.path));
  }

  async create(dto: CreateJurisdictionDto, actorBearerId: string) {
    const unit = await this.paths.createUnit(dto);

    await this.auditLog.record({
      actorBearerId,
      action: AuditAction.JURISDICTION_CHANGED,
      targetType: 'JurisdictionUnit',
      targetId: unit.id,
      metadata: { change: 'created', tree: unit.tree, type: unit.type, name: unit.name },
    });

    return unit;
  }

  async update(id: string, dto: UpdateJurisdictionDto, actorBearerId: string) {
    let unit = await this.prisma.jurisdictionUnit.findUniqueOrThrow({ where: { id } });

    if (dto.parentId !== undefined && dto.parentId !== unit.parentId) {
      unit = await this.paths.reparent(id, dto.parentId);
    }
    if (dto.name !== undefined || dto.status !== undefined) {
      unit = await this.prisma.jurisdictionUnit.update({
        where: { id },
        data: { name: dto.name, status: dto.status },
      });
    }

    await this.auditLog.record({
      actorBearerId,
      action: AuditAction.JURISDICTION_CHANGED,
      targetType: 'JurisdictionUnit',
      targetId: unit.id,
      metadata: { change: 'updated', fields: Object.keys(dto) },
    });

    return unit;
  }
}
