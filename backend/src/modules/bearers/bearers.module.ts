import { Module } from '@nestjs/common';
import { BearersController } from './bearers.controller';
import { BearersService } from './bearers.service';

@Module({
  controllers: [BearersController],
  providers: [BearersService],
  exports: [BearersService],
})
export class BearersModule {}
