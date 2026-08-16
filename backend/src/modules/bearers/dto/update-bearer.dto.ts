import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { BearerStatus } from '../../../../generated/prisma/enums';

export class UpdateBearerDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  fatherOrHusbandName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  address?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  habitationOrStreet?: string;

  /** Voter ID number. */
  @IsOptional()
  @IsString()
  @MinLength(1)
  idProofRef?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsString()
  homeAdministrativeUnitId?: string;

  @IsOptional()
  @IsString()
  homeElectoralUnitId?: string;

  /** Correcting this does NOT regenerate the membership ID — its district segment is fixed at issuance. */
  @IsOptional()
  @IsString()
  homeDistrictId?: string;

  /** Marking INACTIVE is a soft removal — history stays intact (spec.md edge case). */
  @IsOptional()
  @IsEnum(BearerStatus)
  status?: BearerStatus;
}
