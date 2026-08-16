import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { CallerScopeService } from './caller-scope.service';

/**
 * For routes any admin role may call, but a plain bearer (no AdminScope at
 * all) may not — e.g. creating a Bearer profile, which carries no
 * jurisdiction of its own to check with ScopedToJurisdictionGuard.
 * Jurisdiction-specific scoping still applies separately wherever a request
 * does name a target jurisdiction (e.g. Assignment creation).
 */
@Injectable()
export class RequireAdminGuard implements CanActivate {
  constructor(private readonly callerScope: CallerScopeService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: { bearerId: string } }>();
    const bearerId = request.user?.bearerId;
    if (!bearerId) return false;

    const scope = await this.callerScope.resolve(bearerId);
    if (scope === null) {
      throw new ForbiddenException({ error: 'NOT_AN_ADMIN', message: 'This account has no admin role assigned' });
    }
    return true;
  }
}
