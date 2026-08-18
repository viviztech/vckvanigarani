import { IsEmail, IsOptional, IsPhoneNumber, IsString, MinLength } from 'class-validator';

export class CreateBearerDto {
  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsString()
  @MinLength(2)
  fatherOrHusbandName!: string;

  @IsPhoneNumber()
  phone!: string;

  /** OTP login identity — required, unique. */
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  address!: string;

  /** "ஊர்/பகுதி/தெரு" — finer-grained locality than any JurisdictionUnit level. */
  @IsString()
  @MinLength(2)
  habitationOrStreet!: string;

  /** Voter ID number. */
  @IsString()
  @MinLength(1)
  idProofRef!: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  /** Home address — independent of any Assignment's jurisdiction (where posted vs. where they live). */
  @IsOptional()
  @IsString()
  homeAdministrativeUnitId?: string;

  @IsOptional()
  @IsString()
  homeElectoralUnitId?: string;

  /** Required — the district segment of the generated membership ID (VCK-VGA-<code>-00001) comes from this. */
  @IsString()
  homeDistrictId!: string;
}
