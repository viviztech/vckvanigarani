import { PrismaService } from '../../src/prisma/prisma.service';
import { NotificationService } from '../../src/common/notifications/notification.service';
import { EventEligibilityService } from '../../src/modules/events/event-eligibility.service';
import { ReminderJob } from '../../src/modules/reminders/reminder.job';
import { JurisdictionPathService } from '../../src/modules/jurisdictions/jurisdiction-path.util';
import { JurisdictionTree, JurisdictionType } from '../../generated/prisma/enums';
import type { PushProvider } from '../../src/common/notifications/push-provider';
import type { MessageProvider } from '../../src/common/notifications/message-provider';

describe('ReminderJob (integration)', () => {
  const prisma = new PrismaService();
  const eligibility = new EventEligibilityService(prisma);
  const paths = new JurisdictionPathService(prisma);

  const bearerIds: string[] = [];
  const postIds: string[] = [];
  const assignmentIds: string[] = [];
  const eventIds: string[] = [];
  const unitIds: string[] = [];

  let district: { id: string };
  let paidBearerId: string;
  let unpaidBearerId: string;

  const makeBearer = async (suffix: string) => {
    const bearer = await prisma.bearer.create({
      data: {
        fullName: `Reminder Test ${suffix}`,
        phone: `+9182000000${suffix}`,
        email: `reminder-test-${suffix}@test.local`,
        address: 'test',
        fatherOrHusbandName: 'test',
        habitationOrStreet: 'test',
        membershipNo: `REM-${suffix}`,
        idProofRef: `REM-ID-${suffix}`,
      },
    });
    bearerIds.push(bearer.id);
    return bearer.id;
  };

  beforeAll(async () => {
    await prisma.onModuleInit();

    const state = await paths.createUnit({ tree: JurisdictionTree.ADMINISTRATIVE, type: JurisdictionType.STATE, name: 'Reminder Test State' });
    unitIds.push(state.id);
    district = await paths.createUnit({ tree: JurisdictionTree.ADMINISTRATIVE, type: JurisdictionType.DISTRICT, name: 'Reminder Test District', parentId: state.id });
    unitIds.push(district.id);

    const post = await prisma.post.create({ data: { name: 'Reminder Test Post', applicableLevels: ['DISTRICT'], capabilities: [] } });
    postIds.push(post.id);

    paidBearerId = await makeBearer('01');
    const paidAssignment = await prisma.assignment.create({ data: { bearerId: paidBearerId, postId: post.id, startDate: new Date() } });
    assignmentIds.push(paidAssignment.id);
    await prisma.assignmentJurisdiction.create({ data: { assignmentId: paidAssignment.id, jurisdictionUnitId: district.id } });

    unpaidBearerId = await makeBearer('02');
    const unpaidAssignment = await prisma.assignment.create({ data: { bearerId: unpaidBearerId, postId: post.id, startDate: new Date() } });
    assignmentIds.push(unpaidAssignment.id);
    await prisma.assignmentJurisdiction.create({ data: { assignmentId: unpaidAssignment.id, jurisdictionUnitId: district.id } });
  });

  afterAll(async () => {
    await prisma.contribution.deleteMany({ where: { eventId: { in: eventIds } } });
    await prisma.event.deleteMany({ where: { id: { in: eventIds } } });
    await prisma.assignmentJurisdiction.deleteMany({ where: { assignmentId: { in: assignmentIds } } });
    await prisma.assignment.deleteMany({ where: { id: { in: assignmentIds } } });
    await prisma.post.deleteMany({ where: { id: { in: postIds } } });
    await prisma.bearer.deleteMany({ where: { id: { in: bearerIds } } });
    for (const id of [district.id, unitIds[0]]) {
      await prisma.jurisdictionUnit.delete({ where: { id } }).catch(() => undefined);
    }
    await prisma.onModuleDestroy();
  });

  it('reminds only the unpaid bearer for an event closing within the window, not one closing far away or already paid', async () => {
    const closingSoon = await prisma.event.create({
      data: {
        title: 'Closing Soon',
        purpose: 'test',
        jurisdictionScopeIds: [district.id],
        openDate: new Date(Date.now() - 60_000),
        closeDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h away — inside the 48h window
      },
    });
    eventIds.push(closingSoon.id);

    const closingFar = await prisma.event.create({
      data: {
        title: 'Closing Far Away',
        purpose: 'test',
        jurisdictionScopeIds: [district.id],
        openDate: new Date(Date.now() - 60_000),
        closeDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days away — outside the window
      },
    });
    eventIds.push(closingFar.id);

    await prisma.contribution.create({
      data: {
        eventId: closingSoon.id,
        bearerId: paidBearerId,
        amount: 100,
        gatewayOrderId: `order_rem_${paidBearerId}`,
        idempotencyKey: `idem_rem_${paidBearerId}`,
        status: 'VERIFIED',
        verifiedAt: new Date(),
      },
    });

    const push: PushProvider = { sendPush: jest.fn().mockResolvedValue(undefined) };
    const message: MessageProvider = { sendMessage: jest.fn().mockResolvedValue(undefined) };
    const notifications = new NotificationService(push, message);
    const job = new ReminderJob(prisma, eligibility, notifications);

    await job.sendReminders();

    expect(push.sendPush).toHaveBeenCalledTimes(1);
    expect(push.sendPush).toHaveBeenCalledWith(unpaidBearerId, expect.objectContaining({ title: expect.any(String) }));
    // never reminded for the paid bearer or the far-off event
    expect(push.sendPush).not.toHaveBeenCalledWith(paidBearerId, expect.anything());
  });
});
