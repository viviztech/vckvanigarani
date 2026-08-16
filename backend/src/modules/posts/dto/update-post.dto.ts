import { IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, MinLength } from 'class-validator';
import { JurisdictionType, OrgLevel, PostBody, PostCapability } from '../../../../generated/prisma/enums';

export class UpdatePostDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsEnum(PostBody)
  body?: PostBody;

  @IsOptional()
  @IsArray()
  @IsEnum(OrgLevel, { each: true })
  applicableLevels?: OrgLevel[];

  @IsOptional()
  @IsEnum(JurisdictionType)
  jurisdictionTypeRule?: JurisdictionType;

  @IsOptional()
  @IsBoolean()
  jurisdictionExpandToChildren?: boolean;

  @IsOptional()
  @IsArray()
  @IsEnum(PostCapability, { each: true })
  capabilities?: PostCapability[];

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsInt()
  rank?: number;
}
