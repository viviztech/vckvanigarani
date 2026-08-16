import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { JurisdictionTree } from '../../../generated/prisma/enums';
import { JurisdictionsService } from '../jurisdictions/jurisdictions.service';
import { PostsService } from '../posts/posts.service';
import { PublicRegistrationsService } from './public-registrations.service';
import { PublicDirectoryService } from './public-directory.service';
import { PublicContentService } from './public-content.service';
import { SubmitRegistrationDto } from './dto/submit-registration.dto';

/**
 * Every route here is deliberately unauthenticated — this is the entire
 * anonymous-caller surface of the API, kept in one place so that boundary
 * is easy to audit. Nothing here writes a Bearer directly (Constitution
 * Principle V) — see PublicRegistrationsService.
 */
@Controller('public')
export class PublicController {
  constructor(
    private readonly jurisdictions: JurisdictionsService,
    private readonly posts: PostsService,
    private readonly registrations: PublicRegistrationsService,
    private readonly directory: PublicDirectoryService,
    private readonly content: PublicContentService,
  ) {}

  /** Jurisdiction names/structure aren't sensitive — same data the admin cascading picker uses, scoped GLOBAL since there's no caller to scope to. */
  @Get('jurisdictions')
  async listJurisdictions(@Query('tree') tree?: JurisdictionTree, @Query('parent') parentId?: string) {
    return this.jurisdictions.list({ tree, parentId }, 'GLOBAL');
  }

  /** Post data (name/body/rank/levels/capabilities) isn't sensitive — same list the admin console uses. */
  @Get('posts')
  async listPosts() {
    return this.posts.list();
  }

  /** Name + post + jurisdiction only — see PublicDirectoryService. */
  @Get('bearers-directory')
  async listBearersDirectory() {
    return this.directory.listBearersDirectory();
  }

  /** Statewide (targetEveryone) published posts only — see PublicContentService. */
  @Get('news')
  async listNews() {
    return this.content.listNews();
  }

  /** Fundraising campaigns with a live raised total — see PublicContentService. */
  @Get('events')
  async listEvents() {
    return this.content.listEvents();
  }

  /**
   * A full form submit is a bigger abuse surface than an OTP ping, so it's
   * throttled tighter than /auth/otp/request's 3/min — 5/hour per IP.
   */
  @Post('registrations')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  async submitRegistration(@Body() dto: SubmitRegistrationDto) {
    return this.registrations.submit(dto);
  }
}
