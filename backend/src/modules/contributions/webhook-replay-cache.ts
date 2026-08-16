import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';

const REPLAY_WINDOW_MS = 10 * 60_000;

/**
 * T030 replay protection: an exact repeat of a previously-handled signed
 * payload arriving again within the window is Razorpay redelivering the
 * same webhook (or a captured request being replayed), not a new event —
 * caught here, before any DB work, rather than only relying on the
 * service-level idempotency-by-order-status check in ContributionsService.
 * Both layers stay in place; this one is just cheaper and catches it first.
 */
@Injectable()
export class WebhookReplayCache {
  private readonly seen = new Map<string, number>();

  /** Returns true if this exact payload was already seen inside the window, and records it either way. */
  checkAndRecord(rawBody: Buffer): boolean {
    const now = Date.now();
    this.prune(now);

    const hash = createHash('sha256').update(rawBody).digest('hex');
    const isReplay = this.seen.has(hash);
    this.seen.set(hash, now);
    return isReplay;
  }

  private prune(now: number): void {
    for (const [hash, seenAt] of this.seen) {
      if (now - seenAt >= REPLAY_WINDOW_MS) this.seen.delete(hash);
    }
  }
}
