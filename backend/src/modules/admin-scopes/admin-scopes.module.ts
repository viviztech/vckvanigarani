import { Module } from '@nestjs/common';
import { AdminScopesController } from './admin-scopes.controller';
import { AdminScopesService } from './admin-scopes.service';

@Module({
  controllers: [AdminScopesController],
  providers: [AdminScopesService],
  exports: [AdminScopesService],
})
export class AdminScopesModule {}
