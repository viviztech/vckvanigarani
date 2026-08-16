import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CallerScope } from '../../common/guards/caller-scope.service';
import { JurisdictionPathService } from '../jurisdictions/jurisdiction-path.util';
import { AssignmentStatus, JurisdictionTree, JurisdictionType } from '../../../generated/prisma/enums';
import type { Bearer, JurisdictionUnit } from '../../../generated/prisma/client';

export interface CoverageReport {
  unfilled: JurisdictionUnit[];
  overlapping: { unit: JurisdictionUnit; bearers: Bearer[] }[];
}

/**
 * FR-012/FR-013, spec.md Story 3: for a Post, the "relevant type" is its
 * jurisdiction_type_rule (electoral posts, e.g. State Secretary ->
 * PARLIAMENT_CONSTITUENCY) or, for an ordinary post, every one of its
 * applicable_levels (OrgLevel and JurisdictionType share the same
 * administrative names — District/Block/Municipality/Town Panchayat).
 */
@Injectable()
export class CoverageReportService {
  constructor(private readonly prisma: PrismaService) {}

  async run(postId: string, scope: CallerScope): Promise<CoverageReport> {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException({ error: 'POST_NOT_FOUND', message: 'Post does not exist' });

    const tree = post.jurisdictionTypeRule ? JurisdictionTree.ELECTORAL : JurisdictionTree.ADMINISTRATIVE;
    // OrgLevel and JurisdictionType share identical names for every
    // administrative level (STATE/DISTRICT/BLOCK/MUNICIPALITY/TOWN_PANCHAYAT)
    // by design — see data-model.md — so this mapping is a same-name lookup,
    // not a coincidence to paper over.
    const relevantTypes: JurisdictionType[] = post.jurisdictionTypeRule
      ? [post.jurisdictionTypeRule]
      : post.applicableLevels.map((level) => JurisdictionType[level as keyof typeof JurisdictionType]);

    const units = await this.prisma.jurisdictionUnit.findMany({
      where: { tree, type: { in: relevantTypes } },
      orderBy: { name: 'asc' },
    });
    const scopedUnits = scope === 'GLOBAL' ? units : units.filter((u) => !!scope && JurisdictionPathService.isAncestorOrSelf(scope.path, u.path));
    if (scopedUnits.length === 0) return { unfilled: [], overlapping: [] };

    const activeAssignments = await this.prisma.assignment.findMany({
      where: {
        postId,
        status: AssignmentStatus.ACTIVE,
        jurisdictions: { some: { jurisdictionUnitId: { in: scopedUnits.map((u) => u.id) } } },
      },
      include: { bearer: true, jurisdictions: true },
    });

    const holdersByUnitId = new Map<string, Bearer[]>();
    for (const assignment of activeAssignments) {
      for (const { jurisdictionUnitId } of assignment.jurisdictions) {
        const list = holdersByUnitId.get(jurisdictionUnitId) ?? [];
        list.push(assignment.bearer);
        holdersByUnitId.set(jurisdictionUnitId, list);
      }
    }

    const unfilled = scopedUnits.filter((u) => !holdersByUnitId.has(u.id));
    const overlapping = scopedUnits
      .filter((u) => (holdersByUnitId.get(u.id)?.length ?? 0) > 1)
      .map((unit) => ({ unit, bearers: holdersByUnitId.get(unit.id)! }));

    return { unfilled, overlapping };
  }
}
