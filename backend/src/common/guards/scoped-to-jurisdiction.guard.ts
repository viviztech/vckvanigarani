import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { JurisdictionPathService } from '../../modules/jurisdictions/jurisdiction-path.util';
import { SCOPE_TARGET_EXTRACTOR, ScopeTargetExtractor } from './scoped-to.decorator';
import { CallerScopeService } from './caller-scope.service';

/**
 * Enforces Constitution Principle V ("Access Scoped to Jurisdiction") at the
 * API layer — the single point every scope-checked route passes through, so
 * scoping can never be skipped by a route forgetting a manual check.
 *
 * A route opts in with @ScopedTo(extractor); a route with no decorator skips
 * this guard entirely (it isn't jurisdiction-scoped data).
 *
 * See specs/001-bearer-hierarchy-register/research.md §4.
 */
@Injectable()
export class ScopedToJurisdictionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly callerScope: CallerScopeService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const extractor = this.reflector.get<ScopeTargetExtractor | undefined>(
      SCOPE_TARGET_EXTRACTOR,
      context.getHandler(),
    );
    if (!extractor) return true; // route isn't jurisdiction-scoped

    const request = context.switchToHttp().getRequest<Request & { user?: { bearerId: string } }>();
    const bearerId = request.user?.bearerId;
    if (!bearerId) return false; // JwtAuthGuard should already have rejected this

    const scope = await this.callerScope.resolve(bearerId);
    if (scope === 'GLOBAL') return true; // Super Admin — matches every jurisdiction

    const targetIds = this.normalizeTargets(extractor(request));
    if (targetIds.length === 0) return true; // nothing to check for this call

    for (const targetId of targetIds) {
      const target = await this.prisma.jurisdictionUnit.findUnique({ where: { id: targetId } });
      if (!target || !scope || !JurisdictionPathService.isAncestorOrSelf(scope.path, target.path)) {
        throw new ForbiddenException({
          error: 'OUT_OF_SCOPE',
          message: 'Target jurisdiction is outside your assigned scope',
        });
      }
    }
    return true;
  }

  private normalizeTargets(value: string | string[] | undefined): string[] {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }
}
