import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { CallerScopeService } from '../../common/guards/caller-scope.service';
import { JurisdictionPathService } from '../jurisdictions/jurisdiction-path.util';
import { AssignmentStatus, AuditAction, EventStatus } from '../../../generated/prisma/enums';
import { CreateEventDto } from './dto/create-event.dto';

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly callerScope: CallerScopeService,
    private readonly auditLog: AuditLogService,
  ) {}

  async create(dto: CreateEventDto, actorBearerId: string) {
    const openDate = new Date(dto.openDate);
    const closeDate = new Date(dto.closeDate);
    if (closeDate <= openDate) {
      throw new BadRequestException({ error: 'INVALID_DATES', message: 'close_date must be after open_date' });
    }

    const scopeUnits = await this.prisma.jurisdictionUnit.findMany({
      where: { id: { in: dto.jurisdictionScopeIds } },
    });
    if (scopeUnits.length !== new Set(dto.jurisdictionScopeIds).size) {
      throw new NotFoundException({ error: 'JURISDICTION_NOT_FOUND', message: 'One or more jurisdiction units do not exist' });
    }

    const event = await this.prisma.event.create({
      data: {
        title: dto.title,
        purpose: dto.purpose,
        bannerUrl: dto.bannerUrl,
        targetAmount: dto.targetAmount,
        suggestedAmountByPost: dto.suggestedAmountByPost,
        jurisdictionScopeIds: dto.jurisdictionScopeIds,
        openDate,
        closeDate,
        createdById: actorBearerId,
      },
    });

    await this.auditLog.record({
      actorBearerId,
      action: AuditAction.EVENT_CREATED,
      targetType: 'Event',
      targetId: event.id,
      metadata: { title: event.title, jurisdictionScopeIds: dto.jurisdictionScopeIds },
    });

    return event;
  }

  async close(id: string, actorBearerId: string) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException({ error: 'EVENT_NOT_FOUND', message: 'Event does not exist' });
    if (event.status !== EventStatus.OPEN) {
      throw new BadRequestException({ error: 'EVENT_ALREADY_CLOSED', message: 'This event is already closed' });
    }

    const closed = await this.prisma.event.update({
      where: { id },
      data: { status: EventStatus.CLOSED, closedById: actorBearerId },
    });

    await this.auditLog.record({
      actorBearerId,
      action: AuditAction.EVENT_CLOSED,
      targetType: 'Event',
      targetId: closed.id,
      metadata: {},
    });

    return closed;
  }

  /** FR-003: every bearer sees events applicable to their own post/jurisdiction. */
  async listForBearer(bearerId: string) {
    const scope = await this.callerScope.resolve(bearerId);
    if (scope === 'GLOBAL') {
      return this.prisma.event.findMany({ orderBy: { openDate: 'desc' } });
    }

    const assignments = await this.prisma.assignment.findMany({
      where: { bearerId, status: AssignmentStatus.ACTIVE },
      include: { jurisdictions: { include: { jurisdictionUnit: true } } },
    });
    const bearerPaths = assignments.flatMap((a) => a.jurisdictions.map((j) => j.jurisdictionUnit.path));
    if (bearerPaths.length === 0) return [];

    const events = await this.prisma.event.findMany({ orderBy: { openDate: 'desc' } });
    const scopeUnitIds = [...new Set(events.flatMap((e) => e.jurisdictionScopeIds))];
    const scopeUnits = await this.prisma.jurisdictionUnit.findMany({ where: { id: { in: scopeUnitIds } } });
    const scopeUnitById = new Map(scopeUnits.map((u) => [u.id, u]));

    return events.filter((event) =>
      event.jurisdictionScopeIds.some((scopeId) => {
        const scopeUnit = scopeUnitById.get(scopeId);
        return scopeUnit && bearerPaths.some((path) => JurisdictionPathService.isAncestorOrSelf(scopeUnit.path, path));
      }),
    );
  }

  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException({ error: 'EVENT_NOT_FOUND', message: 'Event does not exist' });
    return event;
  }
}
