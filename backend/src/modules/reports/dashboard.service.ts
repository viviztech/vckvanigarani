import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CallerScopeService, ReadScope } from '../../common/guards/caller-scope.service';
import { JurisdictionPathService } from '../jurisdictions/jurisdiction-path.util';
import { EventEligibilityService } from '../events/event-eligibility.service';
import { AssignmentStatus, ContributionStatus } from '../../../generated/prisma/enums';
import type { Bearer } from '../../../generated/prisma/client';

export interface DashboardByPostRow {
  postId: string;
  postName: string;
  totalAmount: number;
  contributorCount: number;
}

export interface EventDashboard {
  raised: number;
  target: number | null;
  byPost: DashboardByPostRow[];
  paid: Bearer[];
  unpaid: Bearer[];
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly callerScope: CallerScopeService,
    private readonly eligibility: EventEligibilityService,
  ) {}

  /**
   * FR-009/FR-010/FR-011: totals computed live from the ledger, never a
   * stored total; visibility is Super Admin (all), a scoped admin (their
   * subtree), or a bearer holding an active FINANCE_VIEW post (their
   * assignment's subtree) — see CallerScopeService.resolveForRead.
   */
  async getDashboard(eventId: string, callerBearerId: string): Promise<EventDashboard> {
    const scope = await this.callerScope.resolveForRead(callerBearerId);
    if (!scope) {
      throw new ForbiddenException({ error: 'OUT_OF_SCOPE', message: 'You do not have finance visibility for any jurisdiction' });
    }

    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException({ error: 'EVENT_NOT_FOUND', message: 'Event does not exist' });

    const eligibleBearerIds = await this.scopedEligibleBearerIds(event.jurisdictionScopeIds, scope);

    const verified = await this.prisma.contribution.findMany({
      where: { eventId, status: ContributionStatus.VERIFIED, bearerId: { in: eligibleBearerIds } },
      include: {
        bearer: {
          include: {
            assignments: {
              where: { status: AssignmentStatus.ACTIVE },
              include: { post: true, jurisdictions: { include: { jurisdictionUnit: true } } },
            },
          },
        },
      },
    });

    const raised = verified.reduce((sum, c) => sum + Number(c.amount), 0);

    const byPostMap = new Map<string, DashboardByPostRow>();
    const eventScopeUnits = await this.prisma.jurisdictionUnit.findMany({ where: { id: { in: event.jurisdictionScopeIds } } });
    for (const contribution of verified) {
      const relevantAssignment = contribution.bearer.assignments.find((a) =>
        a.jurisdictions.some((j) => eventScopeUnits.some((su) => JurisdictionPathService.isAncestorOrSelf(su.path, j.jurisdictionUnit.path))),
      );
      const key = relevantAssignment?.post.id ?? 'unknown';
      const row = byPostMap.get(key) ?? {
        postId: key,
        postName: relevantAssignment?.post.name ?? 'Unknown post',
        totalAmount: 0,
        contributorCount: 0,
      };
      row.totalAmount += Number(contribution.amount);
      row.contributorCount += 1;
      byPostMap.set(key, row);
    }

    const paidBearerIds = new Set(verified.map((c) => c.bearerId));
    const [paid, unpaid] = await Promise.all([
      this.prisma.bearer.findMany({ where: { id: { in: [...paidBearerIds] } } }),
      this.prisma.bearer.findMany({ where: { id: { in: eligibleBearerIds.filter((id) => !paidBearerIds.has(id)) } } }),
    ]);

    return {
      raised,
      target: event.targetAmount ? Number(event.targetAmount) : null,
      byPost: [...byPostMap.values()],
      paid,
      unpaid,
    };
  }

  /** EventEligibilityService's full set, narrowed to the caller's own visibility scope. */
  private async scopedEligibleBearerIds(eventScopeIds: string[], scope: Exclude<ReadScope, null>): Promise<string[]> {
    const allEligible = await this.eligibility.eligibleBearerIds(eventScopeIds);
    if (scope === 'GLOBAL') return allEligible;

    const assignments = await this.prisma.assignment.findMany({
      where: { bearerId: { in: allEligible }, status: AssignmentStatus.ACTIVE },
      include: { jurisdictions: { include: { jurisdictionUnit: true } } },
    });
    const inScope = new Set<string>();
    for (const assignment of assignments) {
      const matches = assignment.jurisdictions.some((j) =>
        scope.paths.some((p) => JurisdictionPathService.isAncestorOrSelf(p, j.jurisdictionUnit.path)),
      );
      if (matches) inScope.add(assignment.bearerId);
    }
    return [...inScope];
  }
}
