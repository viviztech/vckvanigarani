import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminRole, AssignmentStatus, PostCapability } from '../../../generated/prisma/enums';

export type CallerScope = 'GLOBAL' | { path: string[] } | null;
export type ReadScope = 'GLOBAL' | { paths: string[][] } | null;

/**
 * Single source of truth for "what jurisdiction subtree can this bearer
 * touch" — used by ScopedToJurisdictionGuard (write-path enforcement) and by
 * list endpoints that need to pre-filter a query rather than reject a
 * request after the fact. Keeping one implementation means both stay in
 * sync automatically (Constitution Principle V).
 */
@Injectable()
export class CallerScopeService {
  constructor(private readonly prisma: PrismaService) {}

  /** AdminScope-only — every write route (ScopedToJurisdictionGuard) uses this. */
  async resolve(bearerId: string): Promise<CallerScope> {
    const adminScope = await this.prisma.adminScope.findUnique({
      where: { adminBearerId: bearerId },
      include: { scopeJurisdictionUnit: true },
    });
    if (!adminScope) return null;
    if (adminScope.role === AdminRole.SUPER_ADMIN) return 'GLOBAL';
    if (!adminScope.scopeJurisdictionUnit) return null;
    return { path: adminScope.scopeJurisdictionUnit.path };
  }

  /**
   * AdminScope, OR — if the caller has none — every jurisdiction covered by
   * an ACTIVE Assignment to a Post whose capabilities include FINANCE_VIEW.
   *
   * Deliberately a *separate* method from resolve(), not an extension of
   * it: resolve() backs ScopedToJurisdictionGuard's write checks (creating
   * an Assignment, closing one), and a FINANCE_VIEW grant is read-only by
   * design (data-model.md's Access resolution rule) — folding it into
   * resolve() would silently hand a Finance Secretary with no AdminScope
   * row the ability to create/close assignments in their jurisdiction,
   * which is not what FR-011 asks for. Use this only for read routes (the
   * feature 002 collection dashboard).
   */
  async resolveForRead(bearerId: string): Promise<ReadScope> {
    const adminScope = await this.resolve(bearerId);
    if (adminScope === 'GLOBAL') return 'GLOBAL';
    if (adminScope) return { paths: [adminScope.path] };

    const financeAssignments = await this.prisma.assignment.findMany({
      where: {
        bearerId,
        status: AssignmentStatus.ACTIVE,
        post: { capabilities: { has: PostCapability.FINANCE_VIEW } },
      },
      include: { jurisdictions: { include: { jurisdictionUnit: true } } },
    });

    const paths = financeAssignments.flatMap((a) => a.jurisdictions.map((j) => j.jurisdictionUnit.path));
    return paths.length > 0 ? { paths } : null;
  }

  /**
   * FR-009/FR-010 + spec.md Story 2 ("An admin OR A BEARER looks up who
   * holds a given post..."): FR-010's subtree restriction is worded only
   * against admins ("restrict each admin... only Super Admin has
   * cross-jurisdiction access") — it says nothing about ordinary bearers.
   * So an admin's directory reads stay scoped to their subtree (resolve()),
   * but a plain bearer with no AdminScope row gets unrestricted directory
   * read access — this is a member lookup ("who is the current Block
   * Organizer for this block"), not an edit surface.
   */
  async resolveForDirectory(bearerId: string): Promise<CallerScope> {
    const adminScope = await this.resolve(bearerId);
    return adminScope ?? 'GLOBAL';
  }
}
