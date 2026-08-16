import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { Request } from 'express';

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 30; // generous — Razorpay can burst-retry, but this caps volumetric abuse

/**
 * T030 hardening for the one route with no @Auth() (WebhookSignatureGuard
 * is its authentication instead) — caps request volume per source IP before
 * the signature check even runs, so a flood of garbage requests can't be
 * used to hammer the HMAC computation or the DB behind it.
 */
@Injectable()
export class WebhookRateLimitGuard implements CanActivate {
  private readonly hits = new Map<string, number[]>();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const now = Date.now();
    const key = request.ip ?? 'unknown';

    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
    if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
      throw new HttpException('Too many webhook requests', HttpStatus.TOO_MANY_REQUESTS);
    }
    recent.push(now);
    this.hits.set(key, recent);
    return true;
  }
}
