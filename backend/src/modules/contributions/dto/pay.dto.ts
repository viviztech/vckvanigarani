import { IsNumber, IsPositive } from 'class-validator';

export class PayDto {
  /** Rupees. Advisory suggested amounts (spec.md Assumptions) don't constrain this. */
  @IsNumber()
  @IsPositive()
  amount!: number;
}
