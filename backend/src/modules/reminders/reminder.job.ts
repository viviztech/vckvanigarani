import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../../common/notifications/notification.service';
import { EventEligibilityService } from '../events/event-eligibility.service';
import { ContributionStatus, EventStatus } from '../../../generated/prisma/enums';

// Events entering this window of their close date get a reminder run.
// Narrow enough that a multi-week-open event isn't reminded daily for its
// whole lifetime — just as it's actually closing (FR-012).
const REMINDER_WINDOW_MS = 48 * 60 * 60 * 1000;

@Injectable()
export class ReminderJob {
  private readonly logger = new Logger(ReminderJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eligibility: EventEligibilityService,
    private readonly notifications: NotificationService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendReminders(): Promise<void> {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_MS);
    const closingSoon = await this.prisma.event.findMany({
      where: { status: EventStatus.OPEN, closeDate: { gte: now, lte: windowEnd } },
    });
    if (closingSoon.length === 0) return;

    this.logger.log(`Sending reminders for ${closingSoon.length} event(s) closing within 48h`);

    for (const event of closingSoon) {
      const eligibleBearerIds = await this.eligibility.eligibleBearerIds(event.jurisdictionScopeIds);
      for (const bearerId of eligibleBearerIds) {
        // FR-012/edge case: checked individually right before sending, not
        // from a list built at the start of the run — a bearer who pays
        // while this job is still working through the list must not get
        // reminded for a contribution that already landed.
        if (await this.hasPaid(event.id, bearerId)) continue;

        const bearer = await this.prisma.bearer.findUnique({ where: { id: bearerId } });
        if (!bearer) continue;

        await this.notifications.notify({
          bearerId,
          phone: bearer.phone,
          title: 'Contribution reminder',
          body: `"${event.title}" closes soon and you haven't contributed yet.`,
        });
      }
    }
  }

  private async hasPaid(eventId: string, bearerId: string): Promise<boolean> {
    const existing = await this.prisma.contribution.findFirst({
      where: { eventId, bearerId, status: ContributionStatus.VERIFIED },
      select: { id: true },
    });
    return existing !== null;
  }
}
