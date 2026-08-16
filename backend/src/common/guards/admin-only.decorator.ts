import { applyDecorators, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../modules/auth/jwt-auth.guard';
import { RequireAdminGuard } from './require-admin.guard';

/** For routes any admin role may call (but a plain bearer with no AdminScope may not). */
export const AdminOnly = () => applyDecorators(UseGuards(JwtAuthGuard, RequireAdminGuard));
