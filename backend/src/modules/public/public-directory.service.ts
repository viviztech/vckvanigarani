import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AssignmentStatus } from '../../../generated/prisma/enums';

/**
 * Backs the public "Office Bearers" hierarchy listing — Constitution
 * Principle IV (privacy by minimum collection): only name + post +
 * jurisdiction ever leave this query. No phone, address, email, or Voter
 * ID. Unlike BearersService.search(), there's no caller scope to apply —
 * this is a public page, everyone with an active posting is visible to
 * everyone.
 */
@Injectable()
export class PublicDirectoryService {
  constructor(private readonly prisma: PrismaService) {}

  async listBearersDirectory() {
    const assignments = await this.prisma.assignment.findMany({
      where: { status: AssignmentStatus.ACTIVE },
      select: {
        id: true,
        bearer: { select: { id: true, fullName: true } },
        post: { select: { id: true, name: true, body: true, rank: true } },
        jurisdictions: {
          select: { jurisdictionUnit: { select: { id: true, name: true, type: true, path: true, districtId: true } } },
        },
      },
      orderBy: { post: { rank: 'asc' } },
    });

    return assignments.map((a) => ({
      assignmentId: a.id,
      bearerId: a.bearer.id,
      fullName: a.bearer.fullName,
      post: a.post,
      jurisdictions: a.jurisdictions.map((j) => j.jurisdictionUnit),
    }));
  }
}
