import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { CoverageController } from './coverage.controller';
import { EventsModule } from '../events/events.module';
import { AssignmentsModule } from '../assignments/assignments.module';

@Module({
  imports: [EventsModule, AssignmentsModule],
  controllers: [DashboardController, CoverageController],
  providers: [DashboardService],
})
export class ReportsModule {}
