import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Auth } from '../../common/guards/auth.decorator';
import { SuperAdminOnly } from '../../common/guards/super-admin-only.decorator';
import { CurrentBearerId } from '../../common/decorators/current-bearer-id.decorator';
import { CallerScopeService } from '../../common/guards/caller-scope.service';
import { JurisdictionTree } from '../../../generated/prisma/enums';
import { JurisdictionsService } from './jurisdictions.service';
import { CreateJurisdictionDto } from './dto/create-jurisdiction.dto';
import { UpdateJurisdictionDto } from './dto/update-jurisdiction.dto';

@Controller('jurisdictions')
export class JurisdictionsController {
  constructor(
    private readonly jurisdictions: JurisdictionsService,
    private readonly callerScope: CallerScopeService,
  ) {}

  @Get()
  @Auth()
  async list(
    @CurrentBearerId() bearerId: string,
    @Query('tree') tree?: JurisdictionTree,
    @Query('parent') parentId?: string,
  ) {
    const scope = await this.callerScope.resolve(bearerId);
    return this.jurisdictions.list({ tree, parentId }, scope);
  }

  @Post()
  @SuperAdminOnly()
  create(@Body() dto: CreateJurisdictionDto, @CurrentBearerId() bearerId: string) {
    return this.jurisdictions.create(dto, bearerId);
  }

  @Patch(':id')
  @SuperAdminOnly()
  update(@Param('id') id: string, @Body() dto: UpdateJurisdictionDto, @CurrentBearerId() bearerId: string) {
    return this.jurisdictions.update(id, dto, bearerId);
  }
}
