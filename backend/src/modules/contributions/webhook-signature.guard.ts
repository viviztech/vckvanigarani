import { createHmac, timingSafeEqual } from 'node:crypto';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';

/**
 * Verifies the `X-Razorpay-Signature` header against an HMAC-SHA256 of the
 * raw request body, using RAZORPAY_WEBHOOK_SECRET — the standard Razorpay
 * webhook verification algorithm (https://razorpay.com/docs/webhooks/validate-test/).
 * This is real verification logic, not a mock: it works identically whether
 * the secret/payload came from a live Razorpay account or a locally-signed
 * test fixture (see specs/002-contribution-events/research.md §1 and the
 * mandatory reconciliation test, T029).
 *
 * This is the only route allowed to move a Contribution to VERIFIED/FAILED
 * (Constitution Principle III, FR-005) — guard it, don't skip it.
 */
@Injectable()
export class WebhookSignatureGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { rawBody?: Buffer }>();
    const signature = request.headers['x-razorpay-signature'];
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!secret || typeof signature !== 'string' || !request.rawBody) return false;

    const expected = createHmac('sha256', secret).update(request.rawBody).digest('hex');
    const expectedBuf = Buffer.from(expected, 'utf-8');
    const actualBuf = Buffer.from(signature, 'utf-8');
    if (expectedBuf.length !== actualBuf.length) return false;

    return timingSafeEqual(expectedBuf, actualBuf);
  }
}
