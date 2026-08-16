import { Module } from '@nestjs/common';
import { BearersModule } from '../bearers/bearers.module';
import { PendingRegistrationsController } from './pending-registrations.controller';
import { PendingRegistrationsService } from './pending-registrations.service';

@Module({
  imports: [BearersModule],
  controllers: [PendingRegistrationsController],
  providers: [PendingRegistrationsService],
})
export class PendingRegistrationsModule {}
