import { applyDecorators, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../modules/auth/jwt-auth.guard';
import { ScopedToJurisdictionGuard } from './scoped-to-jurisdiction.guard';

/**
 * Every protected, jurisdiction-scoped route uses this instead of composing
 * the two guards by hand — order matters (JwtAuthGuard must populate
 * request.user before ScopedToJurisdictionGuard reads it), so bundling them
 * removes the chance of a route getting the order wrong or forgetting the
 * scope guard entirely (Constitution Principle V).
 *
 * A route with no @ScopedTo() decorator still needs @Auth() for
 * authentication — ScopedToJurisdictionGuard no-ops when there's nothing to
 * check, it doesn't replace JwtAuthGuard.
 */
export const Auth = () => applyDecorators(UseGuards(JwtAuthGuard, ScopedToJurisdictionGuard));
