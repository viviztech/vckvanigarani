import { Module } from '@nestjs/common';
import { ContributionsController } from './contributions.controller';
import { ContributionsService } from './contributions.service';
import { WebhookController } from './webhook.controller';
import { WebhookReplayCache } from './webhook-replay-cache';
import { ReconciliationJob } from './reconciliation.job';
import { ReceiptService } from './receipt.service';
import { RECEIPT_STORAGE, LocalReceiptStorage } from './receipt-storage';
import { PAYMENT_PROVIDER, MockPaymentProvider, RazorpayPaymentProvider } from './payment-provider';

@Module({
  controllers: [ContributionsController, WebhookController],
  providers: [
    ContributionsService,
    ReconciliationJob,
    ReceiptService,
    WebhookReplayCache,
    { provide: RECEIPT_STORAGE, useClass: LocalReceiptStorage },
    {
      // PAYMENT_PROVIDER=mock (default) needs no Razorpay account — see
      // backend/README.md "Razorpay test-mode setup".
      provide: PAYMENT_PROVIDER,
      useClass: process.env.PAYMENT_PROVIDER === 'razorpay' ? RazorpayPaymentProvider : MockPaymentProvider,
    },
  ],
  exports: [ContributionsService],
})
export class ContributionsModule {}
