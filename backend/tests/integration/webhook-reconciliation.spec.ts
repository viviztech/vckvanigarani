import { createHmac } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { ContributionsService } from '../../src/modules/contributions/contributions.service';
import { ReceiptService } from '../../src/modules/contributions/receipt.service';
import { JurisdictionPathService } from '../../src/modules/jurisdictions/jurisdiction-path.util';
import {
  AdminRole,
  ContributionStatus,
  EventStatus,
  JurisdictionTree,
  JurisdictionType,
} from '../../generated/prisma/enums';

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET ?? 'dev-webhook-secret-change-me';

function signedPost(app: INestApplication, body: object) {
  // Sign the exact bytes superagent will put on the wire for a plain-object
  // .send() with JSON content type (JSON.stringify) — signing a Buffer we
  // built ourselves and then handing supertest a *different* representation
  // of the same payload produces a signature that doesn't match what the
  // server's rawBody capture actually receives.
  const raw = JSON.stringify(body);
  const signature = createHmac('sha256', WEBHOOK_SECRET).update(raw).digest('hex');
  return request(app.getHttpServer())
    .post('/webhooks/razorpay')
    .set('Content-Type', 'application/json')
    .set('X-Razorpay-Signature', signature)
    .send(body);
}

/**
 * Constitution's mandatory money-touching test: proves a Contribution only
 * ever becomes VERIFIED through a signature-checked webhook, and that a
 * retried delivery cannot double-process it (FR-005, FR-006, edge case
 * "webhook retried by Razorpay").
 */
describe('Webhook -> Contribution reconciliation (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let contributions: ContributionsService;
  let bearerId: string;
  let eventId: string;
  let contributionId: string;
  let gatewayOrderId: string;
  const cleanupUnitIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication<NestExpressApplication>({ rawBody: true });
    await app.init();

    prisma = moduleFixture.get(PrismaService);
    contributions = moduleFixture.get(ContributionsService);
    const paths = moduleFixture.get(JurisdictionPathService);

    const state = await paths.createUnit({
      tree: JurisdictionTree.ADMINISTRATIVE,
      type: JurisdictionType.STATE,
      name: 'Webhook Test State',
    });
    cleanupUnitIds.push(state.id);

    const bearer = await prisma.bearer.create({
      data: {
        fullName: 'Webhook Test Bearer',
        phone: '+919800000001',
        email: 'webhook-reconciliation-bearer@test.local',
        address: 'test',
        fatherOrHusbandName: 'test',
        habitationOrStreet: 'test',
        membershipNo: 'WEBHOOK-TEST-1',
        idProofRef: 'ID-WEBHOOK-1',
      },
    });
    bearerId = bearer.id;
    await prisma.adminScope.create({ data: { adminBearerId: bearerId, role: AdminRole.SUPER_ADMIN } });

    const event = await prisma.event.create({
      data: {
        title: 'Webhook Test Event',
        purpose: 'testing',
        jurisdictionScopeIds: [state.id],
        openDate: new Date(Date.now() - 60_000),
        closeDate: new Date(Date.now() + 60_000),
        createdById: bearerId,
      },
    });
    eventId = event.id;

    const payResult = await contributions.pay(eventId, bearerId, 250);
    contributionId = payResult.contributionId;
    gatewayOrderId = payResult.gatewayOrderId;
  });

  afterAll(async () => {
    await prisma.contribution.deleteMany({ where: { eventId } });
    await prisma.event.delete({ where: { id: eventId } }).catch(() => undefined);
    await prisma.adminScope.deleteMany({ where: { adminBearerId: bearerId } });
    await prisma.bearer.delete({ where: { id: bearerId } }).catch(() => undefined);
    for (const id of cleanupUnitIds) {
      await prisma.jurisdictionUnit.delete({ where: { id } }).catch(() => undefined);
    }
    await app.close();
  });

  it('leaves the Contribution PENDING until a verified webhook arrives', async () => {
    const contribution = await prisma.contribution.findUniqueOrThrow({ where: { id: contributionId } });
    expect(contribution.status).toBe(ContributionStatus.PENDING);
  });

  it('rejects a webhook with an invalid signature and leaves the Contribution untouched', async () => {
    await request(app.getHttpServer())
      .post('/webhooks/razorpay')
      .set('Content-Type', 'application/json')
      .set('X-Razorpay-Signature', 'not-a-real-signature')
      .send(Buffer.from(JSON.stringify({ event: 'payment.captured' })))
      .expect(403);

    const contribution = await prisma.contribution.findUniqueOrThrow({ where: { id: contributionId } });
    expect(contribution.status).toBe(ContributionStatus.PENDING);
  });

  it('verifies the Contribution, generates a receipt, and notifies on a correctly signed webhook', async () => {
    const receiptService = app.get(ReceiptService);
    const generateSpy = jest.spyOn(receiptService, 'generate');

    const payload = {
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_test_123', order_id: gatewayOrderId } } },
    };

    await signedPost(app, payload).expect(200);

    const contribution = await prisma.contribution.findUniqueOrThrow({ where: { id: contributionId } });
    expect(contribution.status).toBe(ContributionStatus.VERIFIED);
    expect(contribution.gatewayPaymentId).toBe('pay_test_123');
    expect(contribution.verifiedAt).not.toBeNull();
    expect(contribution.receiptUrl).toBe(`/receipts/${contributionId}.pdf`);
    expect(generateSpy).toHaveBeenCalledTimes(1);

    generateSpy.mockRestore();
  });

  it('does not double-process a retried webhook delivery for the same order', async () => {
    const receiptService = app.get(ReceiptService);
    const generateSpy = jest.spyOn(receiptService, 'generate');

    const payload = {
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_test_123_retry', order_id: gatewayOrderId } } },
    };

    // Razorpay redelivering the same webhook — must be a no-op, not a second receipt/notification.
    await signedPost(app, payload).expect(200);

    const contribution = await prisma.contribution.findUniqueOrThrow({ where: { id: contributionId } });
    expect(contribution.status).toBe(ContributionStatus.VERIFIED);
    expect(contribution.gatewayPaymentId).toBe('pay_test_123'); // unchanged from the first delivery
    expect(generateSpy).not.toHaveBeenCalled();

    generateSpy.mockRestore();
  });

  it('marks a separate contribution FAILED on a payment.failed webhook, never VERIFIED', async () => {
    const failedPay = await contributions.pay(eventId, bearerId, 100);

    await signedPost(app, {
      event: 'payment.failed',
      payload: { payment: { entity: { id: 'pay_test_failed', order_id: failedPay.gatewayOrderId } } },
    }).expect(200);

    const contribution = await prisma.contribution.findUniqueOrThrow({ where: { id: failedPay.contributionId } });
    expect(contribution.status).toBe(ContributionStatus.FAILED);
  });

  it('reconciles a stuck-PENDING contribution the same way the webhook would (mocked gateway lookup)', async () => {
    const stuckPay = await contributions.pay(eventId, bearerId, 75);

    // Simulate what the reconciliation job does when it finally sees the
    // gateway report a captured payment for an order whose webhook never arrived.
    await contributions.markVerified(stuckPay.gatewayOrderId, 'pay_test_reconciled');

    const contribution = await prisma.contribution.findUniqueOrThrow({ where: { id: stuckPay.contributionId } });
    expect(contribution.status).toBe(ContributionStatus.VERIFIED);
    expect(contribution.gatewayPaymentId).toBe('pay_test_reconciled');
  });

  it('rejects a new payment attempt once the event is closed', async () => {
    await prisma.event.update({ where: { id: eventId }, data: { status: EventStatus.CLOSED } });
    await expect(contributions.pay(eventId, bearerId, 50)).rejects.toMatchObject({
      response: { error: 'EVENT_CLOSED' },
    });
  });
});
