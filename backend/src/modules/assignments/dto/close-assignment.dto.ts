import { IsDateString } from 'class-validator';

export class CloseAssignmentDto {
  @IsDateString()
  endDate!: string;
}
