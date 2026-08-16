import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminRole } from '../../../generated/prisma/enums';

/**
 * Structural writes (Post definitions, jurisdiction-tree edits) and
 * event/contribution creation are Super-Admin-only per the constitution.
 * Requires JwtAuthGuard to have already populated request.user — use the
 * @SuperAdminOnly() composite decorator rather than this guard alone.
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: { bearerId: string } }>();
    const bearerId = request.user?.bearerId;
    if (!bearerId) return false;

    const scope = await this.prisma.adminScope.findUnique({ where: { adminBearerId: bearerId } });
    if (!scope || scope.role !== AdminRole.SUPER_ADMIN) {
      throw new ForbiddenException({ error: 'NOT_SUPER_ADMIN', message: 'Only Super Admin can perform this action' });
    }
    return true;
  }
}
