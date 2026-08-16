import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JurisdictionPathService } from '../jurisdictions/jurisdiction-path.util';
import { AssignmentStatus } from '../../../generated/prisma/enums';

/**
 * "Which bearers does this event apply to" — the same question EventsService
 * asks from a bearer's side (listForBearer) and DashboardService/ReminderJob
 * ask from the event's side. Centralized here so all three stay consistent
 * with FR-003's definition of "applicable territory" instead of drifting.
 */
@Injectable()
export class EventEligibilityService {
  constructor(private readonly prisma: PrismaService) {}

  async eligibleBearerIds(eventJurisdictionScopeIds: string[]): Promise<string[]> {
    const eventScopeUnits = await this.prisma.jurisdictionUnit.findMany({
      where: { id: { in: eventJurisdictionScopeIds } },
    });
    const assignments = await this.prisma.assignment.findMany({
      where: { status: AssignmentStatus.ACTIVE },
      include: { jurisdictions: { include: { jurisdictionUnit: true } } },
    });

    const eligible = new Set<string>();
    for (const assignment of assignments) {
      const matches = assignment.jurisdictions.some((j) =>
        eventScopeUnits.some((su) => JurisdictionPathService.isAncestorOrSelf(su.path, j.jurisdictionUnit.path)),
      );
      if (matches) eligible.add(assignment.bearerId);
    }
    return [...eligible];
  }
}
