import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditAction } from '../../../generated/prisma/enums';
import type { InputJsonValue } from '@prisma/client/runtime/client';

export interface RecordAuditEntryInput {
  actorBearerId: string;
  action: AuditAction;
  targetType: string;
  targetId: string;
  metadata?: InputJsonValue;
}

/**
 * Satisfies FR-014: who created/closed each assignment (and post/jurisdiction/
 * bearer changes), and when. Every mutating action that touches the org
 * structure should call this rather than writing AuditLogEntry rows ad hoc,
 * so the shape of the log stays consistent.
 */
@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: RecordAuditEntryInput): Promise<void> {
    await this.prisma.auditLogEntry.create({
      data: {
        actorBearerId: input.actorBearerId,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        metadata: input.metadata,
      },
    });
  }
}
