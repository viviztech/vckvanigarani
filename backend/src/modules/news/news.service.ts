import { randomUUID } from 'node:crypto';
import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { FeedQueryService } from './feed-query.service';
import { FanoutJob } from './fanout.job';
import { sanitizeNewsBody } from './sanitize.util';
import { AuditAction, JurisdictionStatus, NewsPostStatus } from '../../../generated/prisma/enums';
import { CreateNewsPostDto } from './dto/create-news-post.dto';
import { UpdateNewsPostDto } from './dto/update-news-post.dto';

const NEWS_POST_INCLUDE = { jurisdictions: { include: { jurisdictionUnit: true } } } as const;

@Injectable()
export class NewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly feedQuery: FeedQueryService,
    private readonly fanoutJob: FanoutJob,
  ) {}

  /** FR-001/FR-002: DRAFT by default — publishing is a separate, explicit step. */
  async create(dto: CreateNewsPostDto, actorBearerId: string) {
    this.assertValidTarget(dto.targetEveryone, dto.jurisdictionUnitIds);
    if (!dto.targetEveryone) await this.assertNoneRetired(dto.jurisdictionUnitIds!);

    const post = await this.prisma.newsPost.create({
      data: {
        title: dto.title,
        bodyHtml: sanitizeNewsBody(dto.bodyHtml),
        targetEveryone: dto.targetEveryone,
        authorId: actorBearerId,
        deepLinkSlug: this.generateSlug(dto.title),
        jurisdictions: dto.targetEveryone
          ? undefined
          : { create: dto.jurisdictionUnitIds!.map((jurisdictionUnitId) => ({ jurisdictionUnitId })) },
      },
      include: NEWS_POST_INCLUDE,
    });

    await this.auditLog.record({
      actorBearerId,
      action: AuditAction.NEWS_POST_CREATED,
      targetType: 'NewsPost',
      targetId: post.id,
      metadata: { title: post.title },
    });

    return post;
  }

  /** FR-004/FR-008: never touches `status` — publish/unpublish/republish do that, and only those. */
  async update(id: string, dto: UpdateNewsPostDto, actorBearerId: string) {
    const existing = await this.findOrThrow(id);

    if (dto.targetEveryone !== undefined || dto.jurisdictionUnitIds !== undefined) {
      const targetEveryone = dto.targetEveryone ?? existing.targetEveryone;
      const jurisdictionUnitIds = dto.jurisdictionUnitIds ?? existing.jurisdictions.map((j) => j.jurisdictionUnitId);
      this.assertValidTarget(targetEveryone, jurisdictionUnitIds);
      if (!targetEveryone) await this.assertNoneRetired(jurisdictionUnitIds);
    }

    const post = await this.prisma.$transaction(async (tx) => {
      if (dto.jurisdictionUnitIds !== undefined || dto.targetEveryone !== undefined) {
        await tx.newsPostJurisdiction.deleteMany({ where: { newsPostId: id } });
      }
      return tx.newsPost.update({
        where: { id },
        data: {
          title: dto.title,
          bodyHtml: dto.bodyHtml === undefined ? undefined : sanitizeNewsBody(dto.bodyHtml),
          targetEveryone: dto.targetEveryone,
          jurisdictions:
            dto.jurisdictionUnitIds !== undefined && dto.targetEveryone !== true
              ? { create: dto.jurisdictionUnitIds.map((jurisdictionUnitId) => ({ jurisdictionUnitId })) }
              : undefined,
        },
        include: NEWS_POST_INCLUDE,
      });
    });

    await this.auditLog.record({
      actorBearerId,
      action: AuditAction.NEWS_POST_EDITED,
      targetType: 'NewsPost',
      targetId: post.id,
      metadata: {},
    });

    return post;
  }

  /** FR-005/FR-010, research.md §2: the only transition that notifies — fires the fan-out job without awaiting it. */
  async publish(id: string, actorBearerId: string) {
    const existing = await this.findOrThrow(id);
    if (existing.status !== NewsPostStatus.DRAFT) {
      throw new ConflictException({ error: 'ALREADY_PUBLISHED', message: 'This post is already published' });
    }

    const post = await this.prisma.newsPost.update({
      where: { id },
      data: { status: NewsPostStatus.PUBLISHED, publishedAt: new Date() },
      include: NEWS_POST_INCLUDE,
    });

    await this.auditLog.record({
      actorBearerId,
      action: AuditAction.NEWS_POST_PUBLISHED,
      targetType: 'NewsPost',
      targetId: post.id,
      metadata: {},
    });

    // Deliberately not awaited (FR-010) — publish must return before fan-out
    // finishes, especially for a statewide "everyone" audience.
    void this.fanoutJob.run(post);

    return post;
  }

  /** FR-008: removes it from feeds going forward; already-sent notifications aren't recalled. */
  async unpublish(id: string, actorBearerId: string) {
    await this.findOrThrow(id);
    const post = await this.prisma.newsPost.update({
      where: { id },
      data: { status: NewsPostStatus.UNPUBLISHED },
      include: NEWS_POST_INCLUDE,
    });

    await this.auditLog.record({
      actorBearerId,
      action: AuditAction.NEWS_POST_UNPUBLISHED,
      targetType: 'NewsPost',
      targetId: post.id,
      metadata: {},
    });

    return post;
  }

  /** contracts/api.md: does NOT re-enqueue notifications — only the original DRAFT -> PUBLISHED transition does. */
  async republish(id: string, actorBearerId: string) {
    const existing = await this.findOrThrow(id);
    if (existing.status !== NewsPostStatus.UNPUBLISHED) {
      throw new ConflictException({ error: 'NOT_UNPUBLISHED', message: 'Only an unpublished post can be republished' });
    }

    const post = await this.prisma.newsPost.update({
      where: { id },
      data: { status: NewsPostStatus.PUBLISHED },
      include: NEWS_POST_INCLUDE,
    });

    await this.auditLog.record({
      actorBearerId,
      action: AuditAction.NEWS_POST_PUBLISHED,
      targetType: 'NewsPost',
      targetId: post.id,
      metadata: { republish: true },
    });

    return post;
  }

  feed(bearerId: string, cursor: string | undefined, limit: number) {
    return this.feedQuery.feedFor(bearerId, cursor, limit);
  }

  async findVisibleOrThrow(id: string, bearerId: string) {
    const post = await this.feedQuery.findVisible(id, bearerId);
    if (!post) throw new NotFoundException({ error: 'NEWS_POST_NOT_FOUND', message: 'Post does not exist' });
    return post;
  }

  /** For admin authoring views (composer/drafts) — unlike the feed, not scoped to the caller's own assignments. */
  async findByIdForAdmin(id: string) {
    return this.findOrThrow(id);
  }

  async listDrafts() {
    return this.prisma.newsPost.findMany({
      where: { status: NewsPostStatus.DRAFT },
      include: NEWS_POST_INCLUDE,
      orderBy: { updatedAt: 'desc' },
    });
  }

  private async findOrThrow(id: string) {
    const post = await this.prisma.newsPost.findUnique({ where: { id }, include: NEWS_POST_INCLUDE });
    if (!post) throw new NotFoundException({ error: 'NEWS_POST_NOT_FOUND', message: 'Post does not exist' });
    return post;
  }

  /** FR-002: target_everyone and a non-empty jurisdiction list are mutually exclusive. */
  private assertValidTarget(targetEveryone: boolean, jurisdictionUnitIds?: string[]): void {
    if (targetEveryone) return;
    if (!jurisdictionUnitIds || jurisdictionUnitIds.length === 0) {
      throw new UnprocessableEntityException({
        error: 'INVALID_TARGET',
        message: 'Provide at least one jurisdiction unit, or set targetEveryone',
      });
    }
  }

  /** FR-009/research.md §6. */
  private async assertNoneRetired(jurisdictionUnitIds: string[]): Promise<void> {
    const units = await this.prisma.jurisdictionUnit.findMany({ where: { id: { in: jurisdictionUnitIds } } });
    if (units.length !== new Set(jurisdictionUnitIds).size) {
      throw new NotFoundException({ error: 'JURISDICTION_NOT_FOUND', message: 'One or more jurisdiction units do not exist' });
    }
    if (units.some((u) => u.status === JurisdictionStatus.RETIRED)) {
      throw new UnprocessableEntityException({ error: 'RETIRED_JURISDICTION', message: 'Cannot target a retired jurisdiction unit' });
    }
  }

  private generateSlug(title: string): string {
    const base = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 60);
    return `${base || 'post'}-${randomUUID().slice(0, 8)}`;
  }
}
