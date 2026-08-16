import { Global, Module } from '@nestjs/common';
import { CallerScopeService } from './caller-scope.service';

// Global so ScopedToJurisdictionGuard/SuperAdminGuard resolve CallerScopeService
// no matter which feature module's controller they're attached to.
@Global()
@Module({
  providers: [CallerScopeService],
  exports: [CallerScopeService],
})
export class GuardsModule {}
