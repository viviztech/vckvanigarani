import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { Auth } from '../../common/guards/auth.decorator';
import { SuperAdminOnly } from '../../common/guards/super-admin-only.decorator';
import { CurrentBearerId } from '../../common/decorators/current-bearer-id.decorator';
import { NewsService } from './news.service';
import { CreateNewsPostDto } from './dto/create-news-post.dto';
import { UpdateNewsPostDto } from './dto/update-news-post.dto';

const DEFAULT_FEED_LIMIT = 20;

@Controller('news')
export class NewsController {
  constructor(private readonly news: NewsService) {}

  /** FR-006: live per bearer, cursor-paginated (T022). */
  @Get('feed')
  @Auth()
  feed(
    @CurrentBearerId() bearerId: string,
    @Query('cursor') cursor?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.news.feed(bearerId, cursor, limit && limit > 0 ? Math.min(limit, 100) : DEFAULT_FEED_LIMIT);
  }

  /** Not in contracts/api.md's bearer-facing surface — supports the admin-web Drafts list (T019). */
  @Get('drafts')
  @SuperAdminOnly()
  drafts() {
    return this.news.listDrafts();
  }

  /** Supports the admin-web composer loading a DRAFT for editing (T013) — GET /news/:id below is feed-visibility-scoped and would 404 a draft. */
  @Get(':id/edit')
  @SuperAdminOnly()
  findForEdit(@Param('id') id: string) {
    return this.news.findByIdForAdmin(id);
  }

  @Get(':id')
  @Auth()
  findOne(@Param('id') id: string, @CurrentBearerId() bearerId: string) {
    return this.news.findVisibleOrThrow(id, bearerId);
  }

  @Post()
  @SuperAdminOnly()
  create(@Body() dto: CreateNewsPostDto, @CurrentBearerId() bearerId: string) {
    return this.news.create(dto, bearerId);
  }

  @Patch(':id')
  @SuperAdminOnly()
  update(@Param('id') id: string, @Body() dto: UpdateNewsPostDto, @CurrentBearerId() bearerId: string) {
    return this.news.update(id, dto, bearerId);
  }

  @Post(':id/publish')
  @SuperAdminOnly()
  publish(@Param('id') id: string, @CurrentBearerId() bearerId: string) {
    return this.news.publish(id, bearerId);
  }

  @Post(':id/unpublish')
  @SuperAdminOnly()
  unpublish(@Param('id') id: string, @CurrentBearerId() bearerId: string) {
    return this.news.unpublish(id, bearerId);
  }

  @Post(':id/republish')
  @SuperAdminOnly()
  republish(@Param('id') id: string, @CurrentBearerId() bearerId: string) {
    return this.news.republish(id, bearerId);
  }
}
