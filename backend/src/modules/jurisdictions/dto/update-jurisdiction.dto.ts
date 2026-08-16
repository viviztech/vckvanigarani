import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { JurisdictionStatus } from '../../../../generated/prisma/enums';

export class UpdateJurisdictionDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  /** Re-points the unit (and cascades to descendants) — see JurisdictionPathService.reparent. */
  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsEnum(JurisdictionStatus)
  status?: JurisdictionStatus;
}
