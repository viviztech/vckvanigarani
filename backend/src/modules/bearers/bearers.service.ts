import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { CallerScope } from '../../common/guards/caller-scope.service';
import { JurisdictionPathService } from '../jurisdictions/jurisdiction-path.util';
import { AssignmentStatus, AuditAction, JurisdictionTree, JurisdictionType } from '../../../generated/prisma/enums';
import { CreateBearerDto } from './dto/create-bearer.dto';
import { UpdateBearerDto } from './dto/update-bearer.dto';

const HOME_ADMINISTRATIVE_TYPES: JurisdictionType[] = [
  JurisdictionType.BLOCK,
  JurisdictionType.MUNICIPALITY,
  JurisdictionType.TOWN_PANCHAYAT,
  JurisdictionType.VILLAGE,
];

export interface BearerSearchFilters {
  query?: string;
  postId?: string;
  jurisdictionId?: string;
}

@Injectable()
export class BearersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  /**
   * Phone is the dedup key bearer creation upserts on — re-submitting the
   * same phone number is treated as "this is the same person, their details
   * changed" rather than a conflict to reject. Email is also
   * enforced-unique (it's the OTP login key), but isn't used for this
   * upsert match. membershipNo is never touched on this path, only assigned
   * once, on first creation.
   */
  async create(dto: CreateBearerDto) {
    await this.assertValidHomeUnits(dto.homeAdministrativeUnitId, dto.homeElectoralUnitId);
    const districtCode = await this.resolveDistrictCode(dto.homeDistrictId);

    const existing = await this.prisma.bearer.findUnique({ where: { phone: dto.phone } });
    if (existing) {
      const bearer = await this.prisma.bearer.update({ where: { id: existing.id }, data: dto });
      return { bearer, matchedExisting: true };
    }

    const membershipNo = await this.nextMembershipNo(districtCode);
    const bearer = await this.prisma.bearer.create({ data: { ...dto, membershipNo } });
    return { bearer, matchedExisting: false };
  }

  /**
   * VCK-VGA-<district-code>-00001 — the number continues per district (see
   * DistrictMembershipCounter), not a single global counter. The
   * single-row `UPDATE ... RETURNING` is row-locked, so concurrent creates
   * in the same district still get distinct numbers without a separate
   * Postgres SEQUENCE per district.
   */
  private async nextMembershipNo(districtCode: string): Promise<string> {
    const [{ nextNumber }] = await this.prisma.$queryRaw<{ nextNumber: number }[]>`
      UPDATE "DistrictMembershipCounter" SET "nextNumber" = "nextNumber" + 1
      WHERE "districtCode" = ${districtCode}
      RETURNING "nextNumber"
    `;
    return `VCK-VGA-${districtCode}-${nextNumber.toString().padStart(5, '0')}`;
  }

  /** Every new bearer must resolve to a real district — that's what the membership ID's district segment comes from. */
  private async resolveDistrictCode(homeDistrictId: string): Promise<string> {
    const district = await this.prisma.jurisdictionUnit.findUnique({ where: { id: homeDistrictId } });
    if (!district || district.tree !== JurisdictionTree.ADMINISTRATIVE || district.type !== JurisdictionType.DISTRICT || !district.code) {
      throw new BadRequestException({ error: 'INVALID_HOME_DISTRICT', message: 'homeDistrictId must be a real district' });
    }
    return district.code;
  }

  async update(id: string, dto: UpdateBearerDto, actorBearerId: string) {
    const existing = await this.prisma.bearer.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({ error: 'BEARER_NOT_FOUND', message: 'Bearer does not exist' });
    }

    await this.assertValidHomeUnits(dto.homeAdministrativeUnitId, dto.homeElectoralUnitId);
    if (dto.homeDistrictId !== undefined) {
      await this.resolveDistrictCode(dto.homeDistrictId);
    }

    const bearer = await this.prisma.bearer.update({ where: { id }, data: dto });

    if (dto.status !== undefined && dto.status !== existing.status) {
      await this.auditLog.record({
        actorBearerId,
        action: AuditAction.BEARER_STATUS_CHANGED,
        targetType: 'Bearer',
        targetId: bearer.id,
        metadata: { from: existing.status, to: dto.status },
      });
    }

    return bearer;
  }

  /**
   * Home address is independent of any Assignment's jurisdiction, but each
   * reference must still point at a real unit of the right kind: the
   * administrative one at Block/Municipality/Town-Panchayat/Village level
   * (the leaf a home address naturally resolves to), the electoral one at
   * Assembly Constituency (State and Parliament Constituency are recovered
   * from its `path`, same principle as everywhere else in this codebase).
   */
  private async assertValidHomeUnits(homeAdministrativeUnitId?: string, homeElectoralUnitId?: string): Promise<void> {
    if (homeAdministrativeUnitId) {
      const unit = await this.prisma.jurisdictionUnit.findUnique({ where: { id: homeAdministrativeUnitId } });
      if (!unit || unit.tree !== JurisdictionTree.ADMINISTRATIVE || !HOME_ADMINISTRATIVE_TYPES.includes(unit.type)) {
        throw new BadRequestException({
          error: 'INVALID_HOME_ADDRESS',
          message: 'Home administrative unit must be a Block, Municipality, Town Panchayat, or Village',
        });
      }
    }
    if (homeElectoralUnitId) {
      const unit = await this.prisma.jurisdictionUnit.findUnique({ where: { id: homeElectoralUnitId } });
      if (!unit || unit.tree !== JurisdictionTree.ELECTORAL || unit.type !== JurisdictionType.ASSEMBLY_CONSTITUENCY) {
        throw new BadRequestException({
          error: 'INVALID_HOME_ADDRESS',
          message: 'Home electoral unit must be an Assembly Constituency',
        });
      }
    }
  }

  /**
   * FR-009/FR-010, SC-002: fuzzy-matches `query` against fullName using the
   * pg_trgm GIN index (research.md §7) OR an exact/substring match against
   * membershipNo (VCK-VGA-... IDs aren't fuzzy — admins paste or type them
   * verbatim), then narrows to bearers with an ACTIVE assignment matching
   * postId/jurisdictionId and within the caller's scope. A null scope (no
   * AdminScope row) sees nothing — this endpoint is admin-only per
   * contracts/api.md, enforced at the route with @AdminOnly(), so scope is
   * never actually null here in practice.
   */
  async search(filters: BearerSearchFilters, scope: CallerScope) {
    if (!scope) return [];

    let candidateIds: string[] | undefined;
    if (filters.query) {
      const rows = await this.prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM "Bearer"
        WHERE "fullName" ILIKE ${'%' + filters.query + '%'} OR "membershipNo" ILIKE ${'%' + filters.query + '%'}
        ORDER BY similarity("fullName", ${filters.query}) DESC
        LIMIT 200
      `;
      candidateIds = rows.map((r) => r.id);
      if (candidateIds.length === 0) return [];
    }

    let jurisdictionFilterPath: string[] | undefined;
    if (filters.jurisdictionId) {
      const unit = await this.prisma.jurisdictionUnit.findUnique({ where: { id: filters.jurisdictionId } });
      if (!unit) return [];
      jurisdictionFilterPath = unit.path;
    }

    const bearers = await this.prisma.bearer.findMany({
      where: candidateIds ? { id: { in: candidateIds } } : undefined,
      include: {
        assignments: {
          where: { status: AssignmentStatus.ACTIVE, ...(filters.postId ? { postId: filters.postId } : {}) },
          include: { jurisdictions: { include: { jurisdictionUnit: true } } },
        },
      },
      orderBy: { fullName: 'asc' },
    });

    return bearers
      .filter((bearer) =>
        bearer.assignments.some((assignment) =>
          assignment.jurisdictions.some((j) => {
            const path = j.jurisdictionUnit.path;
            const withinFilter = !jurisdictionFilterPath || JurisdictionPathService.isAncestorOrSelf(jurisdictionFilterPath, path);
            const withinScope = scope === 'GLOBAL' || JurisdictionPathService.isAncestorOrSelf(scope.path, path);
            return withinFilter && withinScope;
          }),
        ),
      )
      .map(({ assignments: _assignments, ...bearer }) => bearer);
  }

  /**
   * The full bearer roster (unlike search(), no active-assignment is
   * required to appear — a newly created, not-yet-posted bearer must still
   * show up here, since managing postings starts from this list). GLOBAL
   * sees everyone; a scoped admin sees a bearer if either their home
   * address or any active posting falls within the admin's subtree.
   */
  async list(scope: CallerScope) {
    if (!scope) return [];

    const bearers = await this.prisma.bearer.findMany({
      include: {
        homeAdministrativeUnit: true,
        homeElectoralUnit: true,
        homeDistrict: true,
        assignments: {
          where: { status: AssignmentStatus.ACTIVE },
          include: { post: true, jurisdictions: { include: { jurisdictionUnit: true } } },
        },
      },
      orderBy: { fullName: 'asc' },
    });

    if (scope === 'GLOBAL') return bearers;

    return bearers.filter((bearer) => {
      const homeWithinScope =
        (bearer.homeAdministrativeUnit && JurisdictionPathService.isAncestorOrSelf(scope.path, bearer.homeAdministrativeUnit.path)) ||
        (bearer.homeElectoralUnit && JurisdictionPathService.isAncestorOrSelf(scope.path, bearer.homeElectoralUnit.path)) ||
        (bearer.homeDistrict && JurisdictionPathService.isAncestorOrSelf(scope.path, bearer.homeDistrict.path));
      const postedWithinScope = bearer.assignments.some((a) =>
        a.jurisdictions.some((j) => JurisdictionPathService.isAncestorOrSelf(scope.path, j.jurisdictionUnit.path)),
      );
      return homeWithinScope || postedWithinScope;
    });
  }

  /** FR-... Story 2 scenario 2: current + closed assignments, scoped the same way search() is. */
  async findOne(id: string, scope: CallerScope) {
    const bearer = await this.prisma.bearer.findUnique({
      where: { id },
      include: {
        assignments: {
          orderBy: { startDate: 'desc' },
          include: { post: true, jurisdictions: { include: { jurisdictionUnit: true } } },
        },
      },
    });
    if (!bearer) throw new NotFoundException({ error: 'BEARER_NOT_FOUND', message: 'Bearer does not exist' });

    if (scope !== 'GLOBAL') {
      const visible =
        !!scope &&
        bearer.assignments.some((a) => a.jurisdictions.some((j) => JurisdictionPathService.isAncestorOrSelf(scope.path, j.jurisdictionUnit.path)));
      if (!visible) throw new NotFoundException({ error: 'BEARER_NOT_FOUND', message: 'Bearer does not exist' });
    }

    return bearer;
  }
}
