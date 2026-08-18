import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../src/prisma/prisma.service';
import { JurisdictionPathService } from '../../src/modules/jurisdictions/jurisdiction-path.util';
import { ScopedToJurisdictionGuard } from '../../src/common/guards/scoped-to-jurisdiction.guard';
import { CallerScopeService } from '../../src/common/guards/caller-scope.service';
import { ScopedTo, ScopeTargetExtractor } from '../../src/common/guards/scoped-to.decorator';
import { JurisdictionTree, JurisdictionType, AdminRole } from '../../generated/prisma/enums';

function makeContext(user: { bearerId: string } | undefined, body: unknown, handler: (...a: unknown[]) => unknown) {
  return {
    getHandler: () => handler,
    switchToHttp: () => ({ getRequest: () => ({ user, body }) }),
  } as unknown as ExecutionContext;
}

function handlerScopedTo(extractor: ScopeTargetExtractor) {
  class Dummy {
    @ScopedTo(extractor)
    handle() {}
  }
  return Dummy.prototype.handle;
}

describe('ScopedToJurisdictionGuard (integration)', () => {
  const prisma = new PrismaService();
  const jurisdictions = new JurisdictionPathService(prisma);
  const guard = new ScopedToJurisdictionGuard(new Reflector(), prisma, new CallerScopeService(prisma));

  const createdUnitIds: string[] = [];
  const createdBearerIds: string[] = [];

  let state: { id: string };
  let districtA: { id: string };
  let blockA1: { id: string };
  let districtB: { id: string };
  let superAdminBearerId: string;
  let districtAAdminBearerId: string;
  let noScopeBearerId: string;

  beforeAll(async () => {
    await prisma.onModuleInit();

    state = await jurisdictions.createUnit({ tree: JurisdictionTree.ADMINISTRATIVE, type: JurisdictionType.STATE, name: 'Guard Test State' });
    createdUnitIds.push(state.id);
    districtA = await jurisdictions.createUnit({ tree: JurisdictionTree.ADMINISTRATIVE, type: JurisdictionType.DISTRICT, name: 'District A', parentId: state.id });
    createdUnitIds.push(districtA.id);
    blockA1 = await jurisdictions.createUnit({ tree: JurisdictionTree.ADMINISTRATIVE, type: JurisdictionType.BLOCK, name: 'Block A1', parentId: districtA.id });
    createdUnitIds.push(blockA1.id);
    districtB = await jurisdictions.createUnit({ tree: JurisdictionTree.ADMINISTRATIVE, type: JurisdictionType.DISTRICT, name: 'District B', parentId: state.id });
    createdUnitIds.push(districtB.id);

    const makeBearer = async (suffix: string) =>
      prisma.bearer.create({
        data: {
          fullName: `Guard Test ${suffix}`,
          phone: `+91900000${suffix}`,
          email: `guard-test-${suffix}@test.local`,
          address: 'test',
          fatherOrHusbandName: 'test',
          habitationOrStreet: 'test',
          membershipNo: `GUARD-${suffix}`,
          idProofRef: `ID-${suffix}`,
        },
      });

    const superAdminBearer = await makeBearer('0001');
    createdBearerIds.push(superAdminBearer.id);
    superAdminBearerId = superAdminBearer.id;
    await prisma.adminScope.create({ data: { adminBearerId: superAdminBearerId, role: AdminRole.SUPER_ADMIN } });

    const districtAAdminBearer = await makeBearer('0002');
    createdBearerIds.push(districtAAdminBearer.id);
    districtAAdminBearerId = districtAAdminBearer.id;
    await prisma.adminScope.create({
      data: { adminBearerId: districtAAdminBearerId, role: AdminRole.DISTRICT_ADMIN, scopeJurisdictionUnitId: districtA.id },
    });

    const noScopeBearer = await makeBearer('0003');
    createdBearerIds.push(noScopeBearer.id);
    noScopeBearerId = noScopeBearer.id;
  });

  afterAll(async () => {
    await prisma.adminScope.deleteMany({ where: { adminBearerId: { in: createdBearerIds } } });
    await prisma.bearer.deleteMany({ where: { id: { in: createdBearerIds } } });
    for (const id of [blockA1.id, districtA.id, districtB.id, state.id]) {
      await prisma.jurisdictionUnit.delete({ where: { id } }).catch(() => undefined);
    }
    await prisma.onModuleDestroy();
  });

  it('allows any caller through a route with no @ScopedTo decorator', async () => {
    const plainHandler = () => undefined;
    await expect(guard.canActivate(makeContext(undefined, {}, plainHandler))).resolves.toBe(true);
  });

  it('rejects when the request has no authenticated bearer', async () => {
    const handler = handlerScopedTo(() => 'anything');
    await expect(guard.canActivate(makeContext(undefined, {}, handler))).resolves.toBe(false);
  });

  it('lets Super Admin through regardless of target', async () => {
    const handler = handlerScopedTo(() => districtB.id);
    await expect(
      guard.canActivate(makeContext({ bearerId: superAdminBearerId }, {}, handler)),
    ).resolves.toBe(true);
  });

  it('lets a scoped admin through when the target is inside their subtree', async () => {
    const handler = handlerScopedTo(() => blockA1.id); // Block A1 is under District A
    await expect(
      guard.canActivate(makeContext({ bearerId: districtAAdminBearerId }, {}, handler)),
    ).resolves.toBe(true);
  });

  it('lets a scoped admin through for their own jurisdiction id (ancestor-or-self)', async () => {
    const handler = handlerScopedTo(() => districtA.id);
    await expect(
      guard.canActivate(makeContext({ bearerId: districtAAdminBearerId }, {}, handler)),
    ).resolves.toBe(true);
  });

  it('rejects a scoped admin whose target is outside their subtree', async () => {
    const handler = handlerScopedTo(() => districtB.id); // District B is a sibling, not a descendant
    await expect(
      guard.canActivate(makeContext({ bearerId: districtAAdminBearerId }, {}, handler)),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects a caller with no AdminScope at all when a target is required', async () => {
    const handler = handlerScopedTo(() => districtA.id);
    await expect(
      guard.canActivate(makeContext({ bearerId: noScopeBearerId }, {}, handler)),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('skips the check when the extractor returns no target', async () => {
    const handler = handlerScopedTo(() => undefined);
    await expect(
      guard.canActivate(makeContext({ bearerId: noScopeBearerId }, {}, handler)),
    ).resolves.toBe(true);
  });

  it('checks every id when the extractor returns multiple targets', async () => {
    const handler = handlerScopedTo(() => [blockA1.id, districtB.id]);
    await expect(
      guard.canActivate(makeContext({ bearerId: districtAAdminBearerId }, {}, handler)),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
