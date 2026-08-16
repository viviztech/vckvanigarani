import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/** The authenticated caller's Bearer id, set by JwtAuthGuard via JwtStrategy.validate(). */
export const CurrentBearerId = createParamDecorator((_: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest<Request & { user?: { bearerId: string } }>();
  return request.user!.bearerId;
});
