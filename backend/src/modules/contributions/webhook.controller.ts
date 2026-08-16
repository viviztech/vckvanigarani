import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { WebhookSignatureGuard } from './webhook-signature.guard';
import { WebhookRateLimitGuard } from './webhook-rate-limit.guard';
import { WebhookReplayCache } from './webhook-replay-cache';
import { ContributionsService } from './contributions.service';

interface RazorpayWebhookPayload {
  event: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
      };
    };
  };
}

@Controller('webhooks')
export class WebhookController {
  constructor(
    private readonly contributions: ContributionsService,
    private readonly replayCache: WebhookReplayCache,
  ) {}

  /**
   * The only route allowed to move a Contribution to VERIFIED/FAILED
   * (Constitution Principle III, FR-005) — no @Auth() here, the signature
   * check (WebhookSignatureGuard) is the authentication for this route.
   * Always 200s once the signature is valid, even for events we ignore or
   * replays we skip, so Razorpay doesn't endlessly retry a webhook we've
   * already handled.
   */
  @Post('razorpay')
  @UseGuards(WebhookRateLimitGuard, WebhookSignatureGuard)
  @HttpCode(HttpStatus.OK)
  async handle(
    @Body() payload: RazorpayWebhookPayload,
    @Req() request: Request & { rawBody?: Buffer },
  ): Promise<{ ok: true }> {
    if (request.rawBody && this.replayCache.checkAndRecord(request.rawBody)) {
      return { ok: true };
    }

    const entity = payload.payload?.payment?.entity;
    if (entity?.order_id && entity.id) {
      if (payload.event === 'payment.captured') {
        await this.contributions.markVerified(entity.order_id, entity.id);
      } else if (payload.event === 'payment.failed') {
        await this.contributions.markFailed(entity.order_id, entity.id);
      }
    }
    return { ok: true };
  }
}
