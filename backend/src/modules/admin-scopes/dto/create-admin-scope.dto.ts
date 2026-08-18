import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AdminRole } from '../../../../generated/prisma/enums';

export class CreateAdminScopeDto {
  @IsString()
  bearerId!: string;

  @IsEnum(AdminRole)
  role!: AdminRole;

  /** Required for every role except SUPER_ADMIN — validated in the service, not here (depends on `role`). */
  @IsOptional()
  @IsString()
  scopeJurisdictionUnitId?: string;
}
