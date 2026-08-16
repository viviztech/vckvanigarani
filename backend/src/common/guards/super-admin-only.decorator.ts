import { applyDecorators, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../modules/auth/jwt-auth.guard';
import { SuperAdminGuard } from './super-admin.guard';

/** For routes only Super Admin may call — Post/jurisdiction structure edits, event create/close. */
export const SuperAdminOnly = () => applyDecorators(UseGuards(JwtAuthGuard, SuperAdminGuard));
