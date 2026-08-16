import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { EventEligibilityService } from './event-eligibility.service';

@Module({
  controllers: [EventsController],
  providers: [EventsService, EventEligibilityService],
  exports: [EventsService, EventEligibilityService],
})
export class EventsModule {}
