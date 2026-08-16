import { ArrayNotEmpty, IsArray, IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

/** No `status` field here by design — FR-004/FR-008: PATCH never changes status. */
export class UpdateNewsPostDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  @IsOptional()
  @IsString()
  bodyHtml?: string;

  @IsOptional()
  @IsBoolean()
  targetEveryone?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  jurisdictionUnitIds?: string[];
}
