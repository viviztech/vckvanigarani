import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JurisdictionPathService } from '../jurisdictions/jurisdiction-path.util';
import { AssignmentStatus, BearerStatus, NewsPostStatus } from '../../../generated/prisma/enums';
import type { JurisdictionUnit, NewsPost } from '../../../generated/prisma/client';

type PostWithTargets = NewsPost & { jurisdictions: { jurisdictionUnit: JurisdictionUnit }[] };

const FEED_FETCH_CAP = 500;

export interface FeedPage {
  items: PostWithTargets[];
  nextCursor: string | null;
}

/**
 * data-model.md's Feed resolution query, as a reusable service (T006) — the
 * single implementation of "is this post visible to this bearer" used by
 * both the feed/detail routes (live per FR-006) and the fan-out job
 * (audience at publish time). One rule, not two that could drift.
 */
@Injectable()
export class FeedQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async feedFor(bearerId: string, cursor: string | undefined, limit: number): Promise<FeedPage> {
    const bearerPaths = await this.bearerJurisdictionPaths(bearerId);

    const candidates = await this.prisma.newsPost.findMany({
      where: { status: NewsPostStatus.PUBLISHED },
      include: { jurisdictions: { include: { jurisdictionUnit: true } } },
      orderBy: { publishedAt: 'desc' },
      take: FEED_FETCH_CAP,
    });

    const visible = candidates.filter((post) => this.isVisible(post, bearerPaths));
    const startIndex = cursor ? Math.max(visible.findIndex((p) => p.id === cursor) + 1, 0) : 0;
    const items = visible.slice(startIndex, startIndex + limit);
    const nextCursor = startIndex + limit < visible.length ? items[items.length - 1]?.id ?? null : null;

    return { items, nextCursor };
  }

  /** GET /news/:id 404s if not visible to the caller, per contracts/api.md. */
  async findVisible(postId: string, bearerId: string): Promise<PostWithTargets | null> {
    const post = await this.prisma.newsPost.findUnique({
      where: { id: postId },
      include: { jurisdictions: { include: { jurisdictionUnit: true } } },
    });
    if (!post || post.status !== NewsPostStatus.PUBLISHED) return null;
    const bearerPaths = await this.bearerJurisdictionPaths(bearerId);
    return this.isVisible(post, bearerPaths) ? post : null;
  }

  /** FR-005: the fan-out job's audience for a just-published post. */
  async eligibleBearerIds(post: PostWithTargets): Promise<string[]> {
    if (post.targetEveryone) {
      const active = await this.prisma.bearer.findMany({ where: { status: BearerStatus.ACTIVE }, select: { id: true } });
      return active.map((b) => b.id);
    }

    const targetPaths = post.jurisdictions.map((j) => j.jurisdictionUnit.path);
    const assignments = await this.prisma.assignment.findMany({
      where: { status: AssignmentStatus.ACTIVE, bearer: { status: BearerStatus.ACTIVE } },
      include: { jurisdictions: { include: { jurisdictionUnit: true } } },
    });

    const eligible = new Set<string>();
    for (const assignment of assignments) {
      const matches = assignment.jurisdictions.some((j) =>
        targetPaths.some((tp) => JurisdictionPathService.isAncestorOrSelf(tp, j.jurisdictionUnit.path)),
      );
      if (matches) eligible.add(assignment.bearerId);
    }
    return [...eligible];
  }

  private isVisible(post: PostWithTargets, bearerPaths: string[][]): boolean {
    if (post.targetEveryone) return true;
    return post.jurisdictions.some((npj) => bearerPaths.some((bp) => JurisdictionPathService.isAncestorOrSelf(npj.jurisdictionUnit.path, bp)));
  }

  private async bearerJurisdictionPaths(bearerId: string): Promise<string[][]> {
    const assignments = await this.prisma.assignment.findMany({
      where: { bearerId, status: AssignmentStatus.ACTIVE },
      include: { jurisdictions: { include: { jurisdictionUnit: true } } },
    });
    return assignments.flatMap((a) => a.jurisdictions.map((j) => j.jurisdictionUnit.path));
  }
}
