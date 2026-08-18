import { PrismaService } from '../../src/prisma/prisma.service';
import { CallerScopeService } from '../../src/common/guards/caller-scope.service';
import { JurisdictionPathService } from '../../src/modules/jurisdictions/jurisdiction-path.util';
import { AdminRole, JurisdictionTree, JurisdictionType, PostCapability } from '../../generated/prisma/enums';

describe('CallerScopeService.resolveForRead (integration)', () => {
  const prisma = new PrismaService();
  const jurisdictions = new JurisdictionPathService(prisma);
  const callerScope = new CallerScopeService(prisma);

  const bearerIds: string[] = [];
  const unitIds: string[] = [];
  const postIds: string[] = [];
  const assignmentIds: string[] = [];

  let district: { id: string; path: string[] };

  beforeAll(async () => {
    await prisma.onModuleInit();

    const state = await jurisdictions.createUnit({
      tree: JurisdictionTree.ADMINISTRATIVE,
      type: JurisdictionType.STATE,
      name: 'ReadScope Test State',
    });
    unitIds.push(state.id);
    district = await jurisdictions.createUnit({
      tree: JurisdictionTree.ADMINISTRATIVE,
      type: JurisdictionType.DISTRICT,
      name: 'ReadScope Test District',
      parentId: state.id,
    });
    unitIds.push(district.id);
  });

  afterAll(async () => {
    await prisma.assignmentJurisdiction.deleteMany({ where: { assignmentId: { in: assignmentIds } } });
    await prisma.assignment.deleteMany({ where: { id: { in: assignmentIds } } });
    await prisma.adminScope.deleteMany({ where: { adminBearerId: { in: bearerIds } } });
    await prisma.post.deleteMany({ where: { id: { in: postIds } } });
    await prisma.bearer.deleteMany({ where: { id: { in: bearerIds } } });
    for (const id of [district.id, unitIds[0]]) {
      await prisma.jurisdictionUnit.delete({ where: { id } }).catch(() => undefined);
    }
    await prisma.onModuleDestroy();
  });

  const makeBearer = async (suffix: string) => {
    const bearer = await prisma.bearer.create({
      data: {
        fullName: `ReadScope ${suffix}`,
        phone: `+9180000000${suffix}`,
        email: `read-scope-${suffix}@test.local`,
        address: 'test',
        fatherOrHusbandName: 'test',
        habitationOrStreet: 'test',
        membershipNo: `RS-${suffix}`,
        idProofRef: `RS-ID-${suffix}`,
      },
    });
    bearerIds.push(bearer.id);
    return bearer;
  };

  it('returns GLOBAL for Super Admin', async () => {
    const bearer = await makeBearer('01');
    await prisma.adminScope.create({ data: { adminBearerId: bearer.id, role: AdminRole.SUPER_ADMIN } });
    await expect(callerScope.resolveForRead(bearer.id)).resolves.toBe('GLOBAL');
  });

  it('returns the AdminScope path for a scoped admin, wrapped in paths[]', async () => {
    const bearer = await makeBearer('02');
    await prisma.adminScope.create({
      data: { adminBearerId: bearer.id, role: AdminRole.DISTRICT_ADMIN, scopeJurisdictionUnitId: district.id },
    });
    await expect(callerScope.resolveForRead(bearer.id)).resolves.toEqual({ paths: [district.path] });
  });

  it('falls back to an active FINANCE_VIEW assignment when there is no AdminScope', async () => {
    const bearer = await makeBearer('03');
    const post = await prisma.post.create({
      data: { name: 'ReadScope Finance Secretary', applicableLevels: ['DISTRICT'], capabilities: [PostCapability.FINANCE_VIEW] },
    });
    postIds.push(post.id);
    const assignment = await prisma.assignment.create({
      data: { bearerId: bearer.id, postId: post.id, startDate: new Date() },
    });
    assignmentIds.push(assignment.id);
    await prisma.assignmentJurisdiction.create({ data: { assignmentId: assignment.id, jurisdictionUnitId: district.id } });

    await expect(callerScope.resolveForRead(bearer.id)).resolves.toEqual({ paths: [district.path] });
  });

  it('does not grant read scope for a post without FINANCE_VIEW', async () => {
    const bearer = await makeBearer('04');
    const post = await prisma.post.create({
      data: { name: 'ReadScope Plain Organizer', applicableLevels: ['DISTRICT'], capabilities: [] },
    });
    postIds.push(post.id);
    const assignment = await prisma.assignment.create({
      data: { bearerId: bearer.id, postId: post.id, startDate: new Date() },
    });
    assignmentIds.push(assignment.id);
    await prisma.assignmentJurisdiction.create({ data: { assignmentId: assignment.id, jurisdictionUnitId: district.id } });

    await expect(callerScope.resolveForRead(bearer.id)).resolves.toBeNull();
  });

  it('ignores a CLOSED FINANCE_VIEW assignment', async () => {
    const bearer = await makeBearer('05');
    const post = await prisma.post.create({
      data: { name: 'ReadScope Closed Finance Secretary', applicableLevels: ['DISTRICT'], capabilities: [PostCapability.FINANCE_VIEW] },
    });
    postIds.push(post.id);
    const assignment = await prisma.assignment.create({
      data: { bearerId: bearer.id, postId: post.id, startDate: new Date(), status: 'CLOSED', endDate: new Date() },
    });
    assignmentIds.push(assignment.id);
    await prisma.assignmentJurisdiction.create({ data: { assignmentId: assignment.id, jurisdictionUnitId: district.id } });

    await expect(callerScope.resolveForRead(bearer.id)).resolves.toBeNull();
  });

  it('returns null for a bearer with no AdminScope and no assignments at all', async () => {
    const bearer = await makeBearer('06');
    await expect(callerScope.resolveForRead(bearer.id)).resolves.toBeNull();
  });
});
