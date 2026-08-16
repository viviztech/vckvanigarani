import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Auth } from '../../common/guards/auth.decorator';
import { AdminOnly } from '../../common/guards/admin-only.decorator';
import { CurrentBearerId } from '../../common/decorators/current-bearer-id.decorator';
import { CallerScopeService } from '../../common/guards/caller-scope.service';
import { BearersService } from './bearers.service';
import { CreateBearerDto } from './dto/create-bearer.dto';
import { UpdateBearerDto } from './dto/update-bearer.dto';

@Controller('bearers')
export class BearersController {
  constructor(
    private readonly bearers: BearersService,
    private readonly callerScope: CallerScopeService,
  ) {}

  /**
   * FR-009, spec.md Story 2 — any authenticated bearer, not just admins
   * (mobile's read-only directory screen relies on this). Admins stay
   * scoped to their own subtree; a plain bearer gets org-wide read access
   * — see CallerScopeService.resolveForDirectory for why that's not a gap.
   */
  @Get()
  @Auth()
  async search(
    @CurrentBearerId() bearerId: string,
    @Query('query') query?: string,
    @Query('post_id') postId?: string,
    @Query('jurisdiction_id') jurisdictionId?: string,
  ) {
    const scope = await this.callerScope.resolveForDirectory(bearerId);
    return this.bearers.search({ query, postId, jurisdictionId }, scope);
  }

  /** Full roster (see BearersService.list doc) — admin-only, unlike search() which any bearer can call. */
  @Get('list')
  @AdminOnly()
  async list(@CurrentBearerId() bearerId: string) {
    const scope = await this.callerScope.resolve(bearerId);
    return this.bearers.list(scope);
  }

  @Get(':id')
  @Auth()
  async findOne(@Param('id') id: string, @CurrentBearerId() bearerId: string) {
    const scope = await this.callerScope.resolveForDirectory(bearerId);
    return this.bearers.findOne(id, scope);
  }

  @Get(':id/assignments')
  @Auth()
  async assignments(@Param('id') id: string, @CurrentBearerId() bearerId: string) {
    const scope = await this.callerScope.resolveForDirectory(bearerId);
    const bearer = await this.bearers.findOne(id, scope);
    return bearer.assignments;
  }

  @Post()
  @AdminOnly()
  async create(@Body() dto: CreateBearerDto) {
    // No jurisdiction is checked here — a bare Bearer profile carries none.
    // Placing them in a jurisdiction happens at Assignment creation, which
    // is where ScopedToJurisdictionGuard applies (FR-004, FR-005).
    const { bearer, matchedExisting } = await this.bearers.create(dto);
    return { ...bearer, matchedExisting };
  }

  @Patch(':id')
  @AdminOnly()
  update(@Param('id') id: string, @Body() dto: UpdateBearerDto, @CurrentBearerId() bearerId: string) {
    return this.bearers.update(id, dto, bearerId);
  }
}
