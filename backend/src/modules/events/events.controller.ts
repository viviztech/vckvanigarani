import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Auth } from '../../common/guards/auth.decorator';
import { SuperAdminOnly } from '../../common/guards/super-admin-only.decorator';
import { CurrentBearerId } from '../../common/decorators/current-bearer-id.decorator';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';

@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get()
  @Auth()
  list(@CurrentBearerId() bearerId: string) {
    return this.events.listForBearer(bearerId);
  }

  @Post()
  @SuperAdminOnly()
  create(@Body() dto: CreateEventDto, @CurrentBearerId() bearerId: string) {
    return this.events.create(dto, bearerId);
  }

  @Post(':id/close')
  @SuperAdminOnly()
  close(@Param('id') id: string, @CurrentBearerId() bearerId: string) {
    return this.events.close(id, bearerId);
  }
}
