import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Auth } from '../../common/guards/auth.decorator';
import { CurrentBearerId } from '../../common/decorators/current-bearer-id.decorator';
import { ContributionsService } from './contributions.service';
import { PayDto } from './dto/pay.dto';

@Controller()
export class ContributionsController {
  constructor(private readonly contributions: ContributionsService) {}

  @Post('events/:id/pay')
  @Auth()
  pay(@Param('id') eventId: string, @Body() dto: PayDto, @CurrentBearerId() bearerId: string) {
    return this.contributions.pay(eventId, bearerId, dto.amount);
  }

  @Get('contributions/me')
  @Auth()
  mine(@CurrentBearerId() bearerId: string) {
    return this.contributions.listMine(bearerId);
  }
}
