import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../src/prisma/prisma.service';
import { DashboardService } from '../../src/modules/reports/dashboard.service';
import { CallerScopeService } from '../../src/common/guards/caller-scope.service';
import { JurisdictionPathService } from '../../src/modules/jurisdictions/jurisdiction-path.util';
import { EventEligibilityService } from '../../src/modules/events/event-eligibility.service';
import { AdminRole, JurisdictionTree, JurisdictionType, PostCapability } from '../../generated/prisma/enums';

describe('DashboardService (integration)', () => {
  const prisma = new PrismaService();
  const paths = new JurisdictionPathService(prisma);
  const callerScope = new CallerScopeService(prisma);
  const eligibility = new EventEligibilityService(prisma);
  const dashboard = new DashboardService(prisma, callerScope, eligibility);

  const bearerIds: string[] = [];
  const postIds: string[] = [];
  const assignmentIds: string[] = [];
  const unitIds: string[] = [];
  let eventId: string;
  let districtA: { id: string; path: string[] };
  let districtB: { id: string; path: string[] };
  let superAdminId: string;
  let districtAAdminId: string;
  let financeSecretaryId: string;
  let noScopeBearerId: string;
  let payingBearerA: string;
  let unpaidBearerA: string;

  const makeBearer = async (suffix: string) => {
    const bearer = await prisma.bearer.create({
      data: {
        fullName: `Dashboard Test ${suffix}`,
        phone: `+9181000000${suffix}`,
        address: 'test',
        fatherOrHusbandName: 'test',
        habitationOrStreet: 'test',
        membershipNo: `DASH-${suffix}`,
        idProofRef: `DASH-ID-${suffix}`,
      },
    });
    bearerIds.push(bearer.id);
    return bearer.id;
  };

  beforeAll(async () => {
    await prisma.onModuleInit();

    const state = await paths.createUnit({ tree: JurisdictionTree.ADMINISTRATIVE, type: JurisdictionType.STATE, name: 'Dashboard Test State' });
    unitIds.push(state.id);
    districtA = await paths.createUnit({ tree: JurisdictionTree.ADMINISTRATIVE, type: JurisdictionType.DISTRICT, name: 'Dashboard District A', parentId: state.id });
    unitIds.push(districtA.id);
    districtB = await paths.createUnit({ tree: JurisdictionTree.ADMINISTRATIVE, type: JurisdictionType.DISTRICT, name: 'Dashboard District B', parentId: state.id });
    unitIds.push(districtB.id);

    superAdminId = await makeBearer('01');
    await prisma.adminScope.create({ data: { adminBearerId: superAdminId, role: AdminRole.SUPER_ADMIN } });

    districtAAdminId = await makeBearer('02');
    await prisma.adminScope.create({ data: { adminBearerId: districtAAdminId, role: AdminRole.DISTRICT_ADMIN, scopeJurisdictionUnitId: districtA.id } });

    noScopeBearerId = await makeBearer('03');

    const organizerPost = await prisma.post.create({ data: { name: 'Dashboard Organizer', applicableLevels: ['DISTRICT'], capabilities: [] } });
    postIds.push(organizerPost.id);
    const financePost = await prisma.post.create({ data: { name: 'Dashboard Finance Secretary', applicableLevels: ['DISTRICT'], capabilities: [PostCapability.FINANCE_VIEW] } });
    postIds.push(financePost.id);

    financeSecretaryId = await makeBearer('04');
    const financeAssignment = await prisma.assignment.create({ data: { bearerId: financeSecretaryId, postId: financePost.id, startDate: new Date() } });
    assignmentIds.push(financeAssignment.id);
    await prisma.assignmentJurisdiction.create({ data: { assignmentId: financeAssignment.id, jurisdictionUnitId: districtA.id } });

    payingBearerA = await makeBearer('05');
    const payingAssignment = await prisma.assignment.create({ data: { bearerId: payingBearerA, postId: organizerPost.id, startDate: new Date() } });
    assignmentIds.push(payingAssignment.id);
    await prisma.assignmentJurisdiction.create({ data: { assignmentId: payingAssignment.id, jurisdictionUnitId: districtA.id } });

    unpaidBearerA = await makeBearer('06');
    const unpaidAssignment = await prisma.assignment.create({ data: { bearerId: unpaidBearerA, postId: organizerPost.id, startDate: new Date() } });
    assignmentIds.push(unpaidAssignment.id);
    await prisma.assignmentJurisdiction.create({ data: { assignmentId: unpaidAssignment.id, jurisdictionUnitId: districtA.id } });

    // a bearer in District B — must never show up in District A's dashboard
    const bearerB = await makeBearer('07');
    const assignmentB = await prisma.assignment.create({ data: { bearerId: bearerB, postId: organizerPost.id, startDate: new Date() } });
    assignmentIds.push(assignmentB.id);
    await prisma.assignmentJurisdiction.create({ data: { assignmentId: assignmentB.id, jurisdictionUnitId: districtB.id } });

    const event = await prisma.event.create({
      data: {
        title: 'Dashboard Test Event',
        purpose: 'testing',
        jurisdictionScopeIds: [state.id],
        openDate: new Date(Date.now() - 60_000),
        closeDate: new Date(Date.now() + 60_000),
        createdById: superAdminId,
      },
    });
    eventId = event.id;

    await prisma.contribution.create({
      data: {
        eventId,
        bearerId: payingBearerA,
        amount: 500,
        gatewayOrderId: `order_dash_${payingBearerA}`,
        idempotencyKey: `idem_dash_${payingBearerA}`,
        status: 'VERIFIED',
        verifiedAt: new Date(),
      },
    });
    await prisma.contribution.create({
      data: {
        eventId,
        bearerId: bearerB,
        amount: 999,
        gatewayOrderId: `order_dash_${bearerB}`,
        idempotencyKey: `idem_dash_${bearerB}`,
        status: 'VERIFIED',
        verifiedAt: new Date(),
      },
    });
  });

  afterAll(async () => {
    await prisma.contribution.deleteMany({ where: { eventId } });
    await prisma.event.delete({ where: { id: eventId } }).catch(() => undefined);
    await prisma.assignmentJurisdiction.deleteMany({ where: { assignmentId: { in: assignmentIds } } });
    await prisma.assignment.deleteMany({ where: { id: { in: assignmentIds } } });
    await prisma.adminScope.deleteMany({ where: { adminBearerId: { in: bearerIds } } });
    await prisma.post.deleteMany({ where: { id: { in: postIds } } });
    await prisma.bearer.deleteMany({ where: { id: { in: bearerIds } } });
    for (const id of [districtA.id, districtB.id, unitIds[0]]) {
      await prisma.jurisdictionUnit.delete({ where: { id } }).catch(() => undefined);
    }
    await prisma.onModuleDestroy();
  });

  it('shows Super Admin the full statewide picture', async () => {
    const result = await dashboard.getDashboard(eventId, superAdminId);
    expect(result.raised).toBe(1499);
    expect(result.paid.map((b) => b.id).sort()).toEqual([payingBearerA, ...result.paid.filter((b) => b.id !== payingBearerA).map((b) => b.id)].sort());
    expect(result.paid.length).toBe(2); // payingBearerA + bearerB
  });

  it('scopes a District Admin to only their own district', async () => {
    const result = await dashboard.getDashboard(eventId, districtAAdminId);
    expect(result.raised).toBe(500); // only District A's paid contribution
    expect(result.paid.map((b) => b.id)).toEqual([payingBearerA]);
    // unpaidBearerA AND financeSecretaryId are both eligible-but-unpaid in
    // District A — the Finance Secretary is themselves a bearer with an
    // assignment there, not just a viewer of the dashboard.
    expect(result.unpaid.map((b) => b.id).sort()).toEqual([unpaidBearerA, financeSecretaryId].sort());
  });

  it('lets a non-admin Finance Secretary see their own district via FINANCE_VIEW', async () => {
    const result = await dashboard.getDashboard(eventId, financeSecretaryId);
    expect(result.raised).toBe(500);
    expect(result.paid.map((b) => b.id)).toEqual([payingBearerA]);
  });

  it('breaks the raised total down by contributing post', async () => {
    const result = await dashboard.getDashboard(eventId, districtAAdminId);
    expect(result.byPost).toHaveLength(1);
    expect(result.byPost[0].postName).toBe('Dashboard Organizer');
    expect(result.byPost[0].totalAmount).toBe(500);
    expect(result.byPost[0].contributorCount).toBe(1);
  });

  it('rejects a bearer with no admin role and no FINANCE_VIEW post', async () => {
    await expect(dashboard.getDashboard(eventId, noScopeBearerId)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
