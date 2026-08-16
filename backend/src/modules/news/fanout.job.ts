import { Injectable, Logger } from '@nestjs/common';
import sanitizeHtml from 'sanitize-html';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../../common/notifications/notification.service';
import { FeedQueryService } from './feed-query.service';
import type { JurisdictionUnit, NewsPost } from '../../../generated/prisma/client';

const CHUNK_SIZE = 500;

/**
 * research.md §2/FR-010: publish enqueues this rather than sending
 * synchronously — NewsService.publish() calls run() without awaiting it, so
 * a statewide "everyone" publish doesn't block the API response or risk a
 * timeout. No dedicated queue (BullMQ etc.) yet, same "revisit if it stops
 * being enough" call already made for feature 002's reminder job.
 */
@Injectable()
export class FanoutJob {
  private readonly logger = new Logger(FanoutJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly feedQuery: FeedQueryService,
    private readonly notifications: NotificationService,
  ) {}

  async run(post: NewsPost & { jurisdictions: { jurisdictionUnit: JurisdictionUnit }[] }): Promise<void> {
    const bearerIds = await this.feedQuery.eligibleBearerIds(post);
    this.logger.log(`Fanning out "${post.title}" to ${bearerIds.length} bearer(s)`);

    const plainBody = sanitizeHtml(post.bodyHtml, { allowedTags: [], allowedAttributes: {} }).trim();

    for (let i = 0; i < bearerIds.length; i += CHUNK_SIZE) {
      const chunk = bearerIds.slice(i, i + CHUNK_SIZE);
      const bearers = await this.prisma.bearer.findMany({ where: { id: { in: chunk } } });
      await Promise.allSettled(
        bearers.map((bearer) =>
          this.notifications.notify({ bearerId: bearer.id, phone: bearer.phone, title: post.title, body: plainBody }),
        ),
      );
    }
  }
}
