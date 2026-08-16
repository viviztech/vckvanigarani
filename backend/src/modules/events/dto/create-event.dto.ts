import { ArrayNotEmpty, IsArray, IsDateString, IsNumber, IsObject, IsOptional, IsPositive, IsString, MinLength } from 'class-validator';

export class CreateEventDto {
  @IsString()
  @MinLength(2)
  title!: string;

  @IsString()
  @MinLength(2)
  purpose!: string;

  @IsOptional()
  @IsString()
  bannerUrl?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  targetAmount?: number;

  /** postId -> suggested amount, advisory only (spec.md Assumptions). */
  @IsOptional()
  @IsObject()
  suggestedAmountByPost?: Record<string, number>;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  jurisdictionScopeIds!: string[];

  @IsDateString()
  openDate!: string;

  @IsDateString()
  closeDate!: string;
}
