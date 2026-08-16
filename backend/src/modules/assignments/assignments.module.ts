import { Module } from '@nestjs/common';
import { AssignmentsController } from './assignments.controller';
import { AssignmentsService } from './assignments.service';
import { CoverageReportService } from './coverage-report.service';

@Module({
  controllers: [AssignmentsController],
  providers: [AssignmentsService, CoverageReportService],
  exports: [CoverageReportService],
})
export class AssignmentsModule {}
