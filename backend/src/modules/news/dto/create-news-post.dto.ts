import { ArrayNotEmpty, IsArray, IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateNewsPostDto {
  @IsString()
  @MinLength(2)
  title!: string;

  @IsString()
  bodyHtml!: string;

  @IsBoolean()
  targetEveryone!: boolean;

  /** Required (and non-empty) when targetEveryone is false — checked in the service, not here (needs the boolean). */
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  jurisdictionUnitIds?: string[];
}
