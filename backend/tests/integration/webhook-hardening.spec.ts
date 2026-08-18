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
import { AdminRole, JurisdictionTree, JurisdictionType } from '../../generated/prisma/enums';

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET ?? 'dev-webhook-secret-change-me';

function signedPost(app: INestApplication, body: object) {
  const raw = JSON.stringify(body);
  const signature = createHmac('sha256', WEBHOOK_SECRET).update(raw).digest('hex');
  return request(app.getHttpServer())
    .post('/webhooks/razorpay')
    .set('Content-Type', 'application/json')
    .set('X-Razorpay-Signature', signature)
    .send(body);
}

/** T030: rate limiting and replay protection on the one unauthenticated-until-signed route. */
describe('Webhook hardening — rate limit and replay (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let contributions: ContributionsService;
  let bearerId: string;
  let eventId: string;
  const cleanupUnitIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication<NestExpressApplication>({ rawBody: true });
    await app.init();

    prisma = moduleFixture.get(PrismaService);
    contributions = moduleFixture.get(ContributionsService);
    const paths = moduleFixture.get(JurisdictionPathService);

    const state = await paths.createUnit({ tree: JurisdictionTree.ADMINISTRATIVE, type: JurisdictionType.STATE, name: 'Webhook Hardening State' });
    cleanupUnitIds.push(state.id);

    const bearer = await prisma.bearer.create({
      data: {
        fullName: 'Webhook Hardening Bearer',
        phone: '+919800000099',
        email: 'webhook-hardening-bearer@test.local',
        address: 'test',
        fatherOrHusbandName: 'test',
        habitationOrStreet: 'test',
        membershipNo: 'WEBHOOK-HARD-1',
        idProofRef: 'ID-WEBHOOK-HARD-1',
      },
    });
    bearerId = bearer.id;
    await prisma.adminScope.create({ data: { adminBearerId: bearerId, role: AdminRole.SUPER_ADMIN } });

    const event = await prisma.event.create({
      data: {
        title: 'Webhook Hardening Event',
        purpose: 'testing',
        jurisdictionScopeIds: [state.id],
        openDate: new Date(Date.now() - 60_000),
        closeDate: new Date(Date.now() + 60_000),
        createdById: bearerId,
      },
    });
    eventId = event.id;
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

  it('short-circuits an exact repeat of an already-handled payload without regenerating a receipt', async () => {
    const receiptService = app.get(ReceiptService);
    const generateSpy = jest.spyOn(receiptService, 'generate');

    const pay = await contributions.pay(eventId, bearerId, 60);
    const payload = {
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_hardening_replay', order_id: pay.gatewayOrderId } } },
    };

    await signedPost(app, payload).expect(200);
    expect(generateSpy).toHaveBeenCalledTimes(1);

    // The exact same bytes, signature and all — a captured/replayed delivery.
    await signedPost(app, payload).expect(200);
    expect(generateSpy).toHaveBeenCalledTimes(1); // still 1 — the replay never reached the service

    generateSpy.mockRestore();
  });

  it('rejects with 429 once a single source exceeds the rate limit window', async () => {
    const responses = await Promise.all(
      Array.from({ length: 35 }, (_, i) =>
        signedPost(app, { event: 'unhandled.event', marker: `rate-limit-probe-${i}` }),
      ),
    );
    const statuses = responses.map((r) => r.status);
    expect(statuses.some((s) => s === 200)).toBe(true);
    expect(statuses.some((s) => s === 429)).toBe(true);
  });
});
