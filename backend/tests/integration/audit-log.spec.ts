import { PrismaService } from '../../src/prisma/prisma.service';
import { AuditLogService } from '../../src/common/audit/audit-log.service';
import { AuditAction } from '../../generated/prisma/enums';

describe('AuditLogService (integration)', () => {
  const prisma = new PrismaService();
  const service = new AuditLogService(prisma);
  let actorId: string;
  const entryIds: string[] = [];

  beforeAll(async () => {
    await prisma.onModuleInit();
    const actor = await prisma.bearer.create({
      data: {
        fullName: 'Audit Test Actor',
        phone: '+919000000099',
        address: 'test',
        fatherOrHusbandName: 'test',
        habitationOrStreet: 'test',
        membershipNo: 'AUDIT-0001',
        idProofRef: 'ID-AUDIT-0001',
      },
    });
    actorId = actor.id;
  });

  afterAll(async () => {
    await prisma.auditLogEntry.deleteMany({ where: { id: { in: entryIds } } });
    await prisma.bearer.delete({ where: { id: actorId } }).catch(() => undefined);
    await prisma.onModuleDestroy();
  });

  it('persists an entry with the given action, target, and metadata', async () => {
    await service.record({
      actorBearerId: actorId,
      action: AuditAction.ASSIGNMENT_CREATED,
      targetType: 'Assignment',
      targetId: 'fake-assignment-id',
      metadata: { postName: 'District Secretary' },
    });

    const entries = await prisma.auditLogEntry.findMany({ where: { actorBearerId: actorId } });
    entries.forEach((e) => entryIds.push(e.id));

    expect(entries).toHaveLength(1);
    expect(entries[0].action).toBe(AuditAction.ASSIGNMENT_CREATED);
    expect(entries[0].targetType).toBe('Assignment');
    expect(entries[0].targetId).toBe('fake-assignment-id');
    expect(entries[0].metadata).toEqual({ postName: 'District Secretary' });
  });
});
