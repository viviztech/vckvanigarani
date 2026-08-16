import { Module } from '@nestjs/common';
import { JurisdictionsController } from './jurisdictions.controller';
import { JurisdictionsService } from './jurisdictions.service';
import { JurisdictionPathService } from './jurisdiction-path.util';

@Module({
  controllers: [JurisdictionsController],
  providers: [JurisdictionsService, JurisdictionPathService],
  exports: [JurisdictionPathService, JurisdictionsService],
})
export class JurisdictionsModule {}
