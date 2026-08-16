import { ArrayNotEmpty, IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, MinLength } from 'class-validator';
import { JurisdictionType, OrgLevel, PostBody, PostCapability } from '../../../../generated/prisma/enums';

export class CreatePostDto {
  @IsString()
  @MinLength(2)
  name!: string;

  /** Which part of the organization this post belongs to — main body or a sub-level body (e.g. a wing). Defaults to MAIN. */
  @IsOptional()
  @IsEnum(PostBody)
  body?: PostBody;

  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(OrgLevel, { each: true })
  applicableLevels!: OrgLevel[];

  @IsOptional()
  @IsEnum(JurisdictionType)
  jurisdictionTypeRule?: JurisdictionType;

  /** FR-008: e.g. State Deputy Secretary — one Parliament Constituency in, its Assembly Constituencies stored. */
  @IsOptional()
  @IsBoolean()
  jurisdictionExpandToChildren?: boolean;

  @IsOptional()
  @IsArray()
  @IsEnum(PostCapability, { each: true })
  capabilities?: PostCapability[];

  /** Top-to-bottom hierarchy order for the public Office Bearers listing (lower = higher in the org). Defaults to 0. */
  @IsOptional()
  @IsInt()
  rank?: number;
}
