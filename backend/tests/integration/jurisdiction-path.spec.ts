import { PrismaService } from '../../src/prisma/prisma.service';
import { JurisdictionPathService } from '../../src/modules/jurisdictions/jurisdiction-path.util';
import { JurisdictionTree, JurisdictionType } from '../../generated/prisma/enums';

describe('JurisdictionPathService (integration)', () => {
  const prisma = new PrismaService();
  const service = new JurisdictionPathService(prisma);
  const createdIds: string[] = [];

  beforeAll(async () => {
    await prisma.onModuleInit();
  });

  afterAll(async () => {
    // children before parents to satisfy the FK
    for (const id of [...createdIds].reverse()) {
      await prisma.jurisdictionUnit.delete({ where: { id } }).catch(() => undefined);
    }
    await prisma.onModuleDestroy();
  });

  it('gives the root STATE node path=[self], depth=0', async () => {
    const state = await service.createUnit({
      tree: JurisdictionTree.ADMINISTRATIVE,
      type: JurisdictionType.STATE,
      name: 'Test State',
    });
    createdIds.push(state.id);

    expect(state.path).toEqual([state.id]);
    expect(state.depth).toBe(0);
  });

  it('appends to the parent path and increments depth for a child', async () => {
    const state = await service.createUnit({
      tree: JurisdictionTree.ADMINISTRATIVE,
      type: JurisdictionType.STATE,
      name: 'Test State 2',
    });
    createdIds.push(state.id);

    const district = await service.createUnit({
      tree: JurisdictionTree.ADMINISTRATIVE,
      type: JurisdictionType.DISTRICT,
      name: 'Test District',
      parentId: state.id,
    });
    createdIds.push(district.id);

    expect(district.path).toEqual([state.id, district.id]);
    expect(district.depth).toBe(1);
  });

  it('rejects a DISTRICT whose parent is not a STATE', async () => {
    const districtA = await service.createUnit({
      tree: JurisdictionTree.ADMINISTRATIVE,
      type: JurisdictionType.STATE,
      name: 'Parent State',
    });
    createdIds.push(districtA.id);
    const district = await service.createUnit({
      tree: JurisdictionTree.ADMINISTRATIVE,
      type: JurisdictionType.DISTRICT,
      name: 'District Under State',
      parentId: districtA.id,
    });
    createdIds.push(district.id);

    await expect(
      service.createUnit({
        tree: JurisdictionTree.ADMINISTRATIVE,
        type: JurisdictionType.BLOCK,
        name: 'Block under District OK',
        parentId: 'not-a-real-id',
      }),
    ).rejects.toThrow();

    await expect(
      service.createUnit({
        tree: JurisdictionTree.ADMINISTRATIVE,
        type: JurisdictionType.DISTRICT,
        name: 'District under District (invalid)',
        parentId: district.id,
      }),
    ).rejects.toThrow();
  });

  it('cascades path/depth to descendants on reparent', async () => {
    const stateA = await service.createUnit({
      tree: JurisdictionTree.ELECTORAL,
      type: JurisdictionType.STATE,
      name: 'Electoral State A',
    });
    createdIds.push(stateA.id);
    const stateB = await service.createUnit({
      tree: JurisdictionTree.ELECTORAL,
      type: JurisdictionType.STATE,
      name: 'Electoral State B (root, unused as PC parent in real life — test only)',
    });
    createdIds.push(stateB.id);

    const pc = await service.createUnit({
      tree: JurisdictionTree.ELECTORAL,
      type: JurisdictionType.PARLIAMENT_CONSTITUENCY,
      name: 'Test PC',
      parentId: stateA.id,
    });
    createdIds.push(pc.id);
    const ac = await service.createUnit({
      tree: JurisdictionTree.ELECTORAL,
      type: JurisdictionType.ASSEMBLY_CONSTITUENCY,
      name: 'Test AC',
      parentId: pc.id,
    });
    createdIds.push(ac.id);

    expect(ac.path).toEqual([stateA.id, pc.id, ac.id]);

    // Reparent the PC under stateB is invalid (PC's required parent type is
    // STATE — stateB *is* a STATE, so this should succeed) and must cascade
    // the AC's path/depth too.
    await service.reparent(pc.id, stateB.id);

    const reloadedPc = await prisma.jurisdictionUnit.findUniqueOrThrow({ where: { id: pc.id } });
    const reloadedAc = await prisma.jurisdictionUnit.findUniqueOrThrow({ where: { id: ac.id } });

    expect(reloadedPc.path).toEqual([stateB.id, pc.id]);
    expect(reloadedPc.parentId).toBe(stateB.id);
    expect(reloadedAc.path).toEqual([stateB.id, pc.id, ac.id]);
    expect(reloadedAc.depth).toBe(2);
  });

  it('isAncestorOrSelf treats a prefix match as ancestor-or-self, and non-prefix as not', () => {
    expect(JurisdictionPathService.isAncestorOrSelf(['a'], ['a', 'b', 'c'])).toBe(true);
    expect(JurisdictionPathService.isAncestorOrSelf(['a', 'b', 'c'], ['a', 'b', 'c'])).toBe(true);
    expect(JurisdictionPathService.isAncestorOrSelf(['a', 'b'], ['a', 'x', 'c'])).toBe(false);
    expect(JurisdictionPathService.isAncestorOrSelf(['a', 'b', 'c', 'd'], ['a', 'b'])).toBe(false);
  });
});
