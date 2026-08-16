import { IsEmail, IsOptional, IsPhoneNumber, IsString, Length, MinLength } from 'class-validator';

/** Same field set as CreateBearerDto (the resulting Bearer, on approval, is created from these) plus the OTP code proving phone ownership. */
export class SubmitRegistrationDto {
  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsString()
  @MinLength(2)
  fatherOrHusbandName!: string;

  @IsPhoneNumber()
  phone!: string;

  /** OTP sent via POST /auth/otp/request — verified here, one-time use. */
  @IsString()
  @Length(6, 6)
  code!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @MinLength(2)
  address!: string;

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

  @IsString()
  homeDistrictId!: string;

  @IsOptional()
  @IsString()
  homeAdministrativeUnitId?: string;

  @IsOptional()
  @IsString()
  homeElectoralUnitId?: string;
}
