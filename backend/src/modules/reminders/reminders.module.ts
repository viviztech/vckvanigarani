import { Module } from '@nestjs/common';
import { ReminderJob } from './reminder.job';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [EventsModule],
  providers: [ReminderJob],
})
export class RemindersModule {}
