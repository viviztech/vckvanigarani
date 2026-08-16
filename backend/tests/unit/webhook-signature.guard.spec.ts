import { createHmac } from 'node:crypto';
import type { ExecutionContext } from '@nestjs/common';
import { WebhookSignatureGuard } from '../../src/modules/contributions/webhook-signature.guard';

const SECRET = 'test-webhook-secret';

function makeContext(rawBody: Buffer | undefined, signature: string | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ rawBody, headers: signature ? { 'x-razorpay-signature': signature } : {} }),
    }),
  } as unknown as ExecutionContext;
}

describe('WebhookSignatureGuard', () => {
  const guard = new WebhookSignatureGuard();
  const originalSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  beforeEach(() => {
    process.env.RAZORPAY_WEBHOOK_SECRET = SECRET;
  });
  afterAll(() => {
    process.env.RAZORPAY_WEBHOOK_SECRET = originalSecret;
  });

  it('accepts a signature that matches the HMAC of the raw body', () => {
    const body = Buffer.from(JSON.stringify({ event: 'payment.captured' }));
    const signature = createHmac('sha256', SECRET).update(body).digest('hex');
    expect(guard.canActivate(makeContext(body, signature))).toBe(true);
  });

  it('rejects a signature computed with the wrong secret', () => {
    const body = Buffer.from(JSON.stringify({ event: 'payment.captured' }));
    const wrongSignature = createHmac('sha256', 'not-the-real-secret').update(body).digest('hex');
    expect(guard.canActivate(makeContext(body, wrongSignature))).toBe(false);
  });

  it('rejects a tampered body even with an otherwise-valid-looking signature', () => {
    const originalBody = Buffer.from(JSON.stringify({ event: 'payment.captured', amount: 100 }));
    const signature = createHmac('sha256', SECRET).update(originalBody).digest('hex');
    const tamperedBody = Buffer.from(JSON.stringify({ event: 'payment.captured', amount: 999999 }));
    expect(guard.canActivate(makeContext(tamperedBody, signature))).toBe(false);
  });

  it('rejects when the signature header is missing', () => {
    const body = Buffer.from('{}');
    expect(guard.canActivate(makeContext(body, undefined))).toBe(false);
  });

  it('rejects when rawBody is missing (misconfigured raw-body capture)', () => {
    const signature = createHmac('sha256', SECRET).update('{}').digest('hex');
    expect(guard.canActivate(makeContext(undefined, signature))).toBe(false);
  });

  it('rejects when no webhook secret is configured', () => {
    delete process.env.RAZORPAY_WEBHOOK_SECRET;
    const body = Buffer.from('{}');
    const signature = createHmac('sha256', SECRET).update(body).digest('hex');
    expect(guard.canActivate(makeContext(body, signature))).toBe(false);
  });
});
