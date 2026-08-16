import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { CallerScopeService } from '../../common/guards/caller-scope.service';
import { JurisdictionPathService } from '../jurisdictions/jurisdiction-path.util';
import {
  AssignmentStatus,
  AuditAction,
  BearerStatus,
  JurisdictionTree,
} from '../../../generated/prisma/enums';
import type { JurisdictionUnit } from '../../../generated/prisma/client';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { CloseAssignmentDto } from './dto/close-assignment.dto';

@Injectable()
export class AssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly callerScope: CallerScopeService,
    private readonly auditLog: AuditLogService,
  ) {}

  async create(dto: CreateAssignmentDto, actorBearerId: string) {
    const [bearer, post] = await Promise.all([
      this.prisma.bearer.findUnique({ where: { id: dto.bearerId } }),
      this.prisma.post.findUnique({ where: { id: dto.postId } }),
    ]);
    if (!bearer) throw new NotFoundException({ error: 'BEARER_NOT_FOUND', message: 'Bearer does not exist' });
    if (bearer.status !== BearerStatus.ACTIVE) {
      throw new BadRequestException({ error: 'BEARER_INACTIVE', message: 'Cannot assign an inactive bearer' });
    }
    if (!post) throw new NotFoundException({ error: 'POST_NOT_FOUND', message: 'Post does not exist' });
    if (!post.active) {
      throw new BadRequestException({ error: 'POST_INACTIVE', message: 'Cannot assign an inactive post' });
    }

    const inputUnits = await this.loadUnits(dto.jurisdictionUnitIds);
    this.assertInputMatchesPostRule(post, inputUnits);

    const storedUnits = post.jurisdictionExpandToChildren
      ? await this.expandToChildren(inputUnits)
      : inputUnits;

    const assignment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.assignment.create({
        data: {
          bearerId: dto.bearerId,
          postId: dto.postId,
          startDate: new Date(dto.startDate),
          createdById: actorBearerId,
        },
      });
      await tx.assignmentJurisdiction.createMany({
        data: storedUnits.map((unit) => ({ assignmentId: created.id, jurisdictionUnitId: unit.id })),
      });
      return created;
    });

    await this.auditLog.record({
      actorBearerId,
      action: AuditAction.ASSIGNMENT_CREATED,
      targetType: 'Assignment',
      targetId: assignment.id,
      metadata: {
        bearerId: dto.bearerId,
        postId: dto.postId,
        postName: post.name,
        jurisdictionUnitIds: storedUnits.map((u) => u.id),
      },
    });

    return this.prisma.assignment.findUniqueOrThrow({
      where: { id: assignment.id },
      include: { jurisdictions: { include: { jurisdictionUnit: true } } },
    });
  }

  async close(id: string, dto: CloseAssignmentDto, actorBearerId: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id },
      include: { jurisdictions: { include: { jurisdictionUnit: true } } },
    });
    if (!assignment) {
      throw new NotFoundException({ error: 'ASSIGNMENT_NOT_FOUND', message: 'Assignment does not exist' });
    }
    if (assignment.status !== AssignmentStatus.ACTIVE) {
      throw new BadRequestException({ error: 'ASSIGNMENT_NOT_ACTIVE', message: 'This assignment is already closed' });
    }
    const endDate = new Date(dto.endDate);
    if (endDate < assignment.startDate) {
      throw new BadRequestException({ error: 'INVALID_END_DATE', message: 'End date cannot be before the start date' });
    }

    // This route has no jurisdiction id in its request body for @ScopedTo()
    // to read — the target is the assignment's *existing* jurisdiction, which
    // requires a DB lookup the guard's synchronous extractor can't do. Same
    // Principle V rule, enforced here directly instead.
    await this.assertCallerCanTouch(
      actorBearerId,
      assignment.jurisdictions.map((j) => j.jurisdictionUnit),
    );

    const closed = await this.prisma.assignment.update({
      where: { id },
      data: { status: AssignmentStatus.CLOSED, endDate, closedById: actorBearerId },
    });

    await this.auditLog.record({
      actorBearerId,
      action: AuditAction.ASSIGNMENT_CLOSED,
      targetType: 'Assignment',
      targetId: closed.id,
      metadata: { endDate: dto.endDate },
    });

    return closed;
  }

  private async assertCallerCanTouch(bearerId: string, units: JurisdictionUnit[]): Promise<void> {
    const scope = await this.callerScope.resolve(bearerId);
    if (scope === 'GLOBAL') return;
    const ok = scope && units.every((u) => JurisdictionPathService.isAncestorOrSelf(scope.path, u.path));
    if (!ok) {
      throw new ForbiddenException({ error: 'OUT_OF_SCOPE', message: 'Target jurisdiction is outside your assigned scope' });
    }
  }

  private async loadUnits(ids: string[]): Promise<JurisdictionUnit[]> {
    const units = await this.prisma.jurisdictionUnit.findMany({ where: { id: { in: ids } } });
    if (units.length !== new Set(ids).size) {
      throw new NotFoundException({ error: 'JURISDICTION_NOT_FOUND', message: 'One or more jurisdiction units do not exist' });
    }
    return units;
  }

  /** FR-008. */
  private assertInputMatchesPostRule(
    post: { jurisdictionTypeRule: string | null; jurisdictionExpandToChildren: boolean; applicableLevels: string[] },
    units: JurisdictionUnit[],
  ): void {
    if (post.jurisdictionExpandToChildren && units.length !== 1) {
      throw new BadRequestException({
        error: 'INVALID_JURISDICTION_INPUT',
        message: 'This post requires selecting exactly one jurisdiction unit',
      });
    }

    if (post.jurisdictionTypeRule) {
      const invalid = units.some((u) => u.tree !== JurisdictionTree.ELECTORAL || u.type !== post.jurisdictionTypeRule);
      if (invalid) {
        throw new BadRequestException({
          error: 'INVALID_JURISDICTION_INPUT',
          message: `This post requires jurisdiction units of type ${post.jurisdictionTypeRule}`,
        });
      }
      return;
    }

    // No explicit rule: an ordinary administrative post — each unit's type
    // must be one of the post's applicable levels (e.g. Organizer is valid
    // at District, Block, Municipality, or Town Panchayat).
    const invalid = units.some(
      (u) => u.tree !== JurisdictionTree.ADMINISTRATIVE || !post.applicableLevels.includes(u.type),
    );
    if (invalid) {
      throw new BadRequestException({
        error: 'INVALID_JURISDICTION_INPUT',
        message: `This post's jurisdiction must match one of its applicable levels: ${post.applicableLevels.join(', ')}`,
      });
    }
  }

  private async expandToChildren(inputUnits: JurisdictionUnit[]): Promise<JurisdictionUnit[]> {
    const [parent] = inputUnits;
    const children = await this.prisma.jurisdictionUnit.findMany({ where: { parentId: parent.id } });
    if (children.length === 0) {
      throw new BadRequestException({
        error: 'NO_CHILD_JURISDICTIONS',
        message: `${parent.name} has no child jurisdictions to assign`,
      });
    }
    return children;
  }
}
