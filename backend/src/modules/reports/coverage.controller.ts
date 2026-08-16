import { Controller, Get, Query } from '@nestjs/common';
import { AdminOnly } from '../../common/guards/admin-only.decorator';
import { CurrentBearerId } from '../../common/decorators/current-bearer-id.decorator';
import { CallerScopeService } from '../../common/guards/caller-scope.service';
import { CoverageReportService } from '../assignments/coverage-report.service';

@Controller('reports')
export class CoverageController {
  constructor(
    private readonly coverage: CoverageReportService,
    private readonly callerScope: CallerScopeService,
  ) {}

  /** FR-012/FR-013, contracts/api.md — any authenticated admin, scoped to caller's subtree. */
  @Get('coverage')
  @AdminOnly()
  async get(@Query('post_id') postId: string, @CurrentBearerId() bearerId: string) {
    const scope = await this.callerScope.resolve(bearerId);
    return this.coverage.run(postId, scope);
  }
}
