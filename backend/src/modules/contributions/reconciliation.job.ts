import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PAYMENT_PROVIDER, PaymentProvider } from './payment-provider';
import { ContributionsService } from './contributions.service';

const GRACE_PERIOD_MS = 5 * 60 * 1000; // matches the 5-minute cron cadence below

/**
 * Catches payments the webhook never confirmed — Razorpay's webhook
 * delivery is best-effort, not guaranteed (research.md §3). Runs the same
 * verify/fail path the webhook uses (ContributionsService.markVerified /
 * markFailed), so a late webhook delivery and this job can never disagree
 * or double-process the same Contribution — both are idempotent on status.
 */
@Injectable()
export class ReconciliationJob {
  private readonly logger = new Logger(ReconciliationJob.name);

  constructor(
    @Inject(PAYMENT_PROVIDER) private readonly paymentProvider: PaymentProvider,
    private readonly contributions: ContributionsService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async reconcilePendingOrders(): Promise<void> {
    const cutoff = new Date(Date.now() - GRACE_PERIOD_MS);
    const stuck = await this.contributions.findPendingOlderThan(cutoff);
    if (stuck.length === 0) return;

    this.logger.log(`Reconciling ${stuck.length} PENDING contribution(s) older than ${GRACE_PERIOD_MS / 60000}m`);

    for (const contribution of stuck) {
      const payments = await this.paymentProvider.fetchOrderPayments(contribution.gatewayOrderId);
      const captured = payments.find((p) => p.status === 'captured');
      const failed = payments.find((p) => p.status === 'failed');

      if (captured) {
        await this.contributions.markVerified(contribution.gatewayOrderId, captured.paymentId);
      } else if (failed) {
        await this.contributions.markFailed(contribution.gatewayOrderId, failed.paymentId);
      }
      // Neither: still genuinely pending at the gateway — leave it, next run checks again.
    }
  }
}
