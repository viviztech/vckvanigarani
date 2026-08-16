import { ArrayNotEmpty, IsArray, IsDateString, IsString } from 'class-validator';

export class CreateAssignmentDto {
  @IsString()
  bearerId!: string;

  @IsString()
  postId!: string;

  /**
   * What the admin selected. For most posts these are stored as-is; for a
   * Post with jurisdictionExpandToChildren=true this must be exactly one id
   * and the assignment is actually stored against ITS CHILDREN (FR-008).
   */
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  jurisdictionUnitIds!: string[];

  @IsDateString()
  startDate!: string;
}
