import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { JurisdictionTree, JurisdictionType } from '../../../../generated/prisma/enums';

export class CreateJurisdictionDto {
  @IsEnum(JurisdictionTree)
  tree!: JurisdictionTree;

  @IsEnum(JurisdictionType)
  type!: JurisdictionType;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}
