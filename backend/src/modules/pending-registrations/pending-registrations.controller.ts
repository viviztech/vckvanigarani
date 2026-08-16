import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AdminOnly } from '../../common/guards/admin-only.decorator';
import { CurrentBearerId } from '../../common/decorators/current-bearer-id.decorator';
import { CallerScopeService } from '../../common/guards/caller-scope.service';
import { PendingRegistrationsService } from './pending-registrations.service';
import { RejectRegistrationDto } from './dto/reject-registration.dto';

@Controller('pending-registrations')
export class PendingRegistrationsController {
  constructor(
    private readonly registrations: PendingRegistrationsService,
    private readonly callerScope: CallerScopeService,
  ) {}

  @Get()
  @AdminOnly()
  async list(@CurrentBearerId() bearerId: string) {
    const scope = await this.callerScope.resolve(bearerId);
    return this.registrations.list(scope);
  }

  @Post(':id/approve')
  @AdminOnly()
  async approve(@Param('id') id: string, @CurrentBearerId() bearerId: string) {
    return this.registrations.approve(id, bearerId);
  }

  @Post(':id/reject')
  @AdminOnly()
  async reject(@Param('id') id: string, @Body() dto: RejectRegistrationDto, @CurrentBearerId() bearerId: string) {
    return this.registrations.reject(id, dto, bearerId);
  }
}
