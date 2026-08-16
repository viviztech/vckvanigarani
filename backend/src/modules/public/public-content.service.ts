import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ContributionStatus, NewsPostStatus } from '../../../generated/prisma/enums';

/**
 * Read-only public content: published statewide news, and fundraising
 * campaigns with a live raised total. No auth — same "everyone" idea as
 * the rest of the `public` module. Deliberately separate queries from
 * NewsService/EventsService, whose feed/list methods bake in per-bearer
 * jurisdiction scoping that has no meaning for an anonymous visitor.
 */
@Injectable()
export class PublicContentService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Only `targetEveryone` posts — jurisdiction-scoped news is written for a
   * specific local audience (e.g. one district's bearers), not the general
   * public.
   */
  async listNews() {
    return this.prisma.newsPost.findMany({
      where: { status: NewsPostStatus.PUBLISHED, targetEveryone: true },
      select: { id: true, title: true, bodyHtml: true, publishedAt: true, deepLinkSlug: true },
      orderBy: { publishedAt: 'desc' },
    });
  }

  /**
   * Every campaign, regardless of jurisdictionScopeIds — that field governs
   * which bearers can contribute inside the app, not public visibility of
   * the campaign. `raised` is computed live from the ledger (Constitution
   * Principle III), never stored; no donor-identifying data included.
   */
  async listEvents() {
    const events = await this.prisma.event.findMany({
      select: { id: true, title: true, purpose: true, bannerUrl: true, targetAmount: true, openDate: true, closeDate: true, status: true },
      orderBy: { openDate: 'desc' },
    });

    const totals = await this.prisma.contribution.groupBy({
      by: ['eventId'],
      where: { status: ContributionStatus.VERIFIED, eventId: { in: events.map((e) => e.id) } },
      _sum: { amount: true },
    });
    const raisedByEvent = new Map(totals.map((t) => [t.eventId, Number(t._sum.amount ?? 0)]));

    return events.map((e) => ({
      ...e,
      targetAmount: e.targetAmount ? Number(e.targetAmount) : null,
      raised: raisedByEvent.get(e.id) ?? 0,
    }));
  }
}
