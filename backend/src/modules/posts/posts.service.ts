import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../common/audit/audit-log.service';
import { AuditAction } from '../../../generated/prisma/enums';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  list() {
    return this.prisma.post.findMany({ orderBy: { name: 'asc' } });
  }

  async create(dto: CreatePostDto, actorBearerId: string) {
    const post = await this.prisma.post.create({
      data: {
        name: dto.name,
        body: dto.body,
        applicableLevels: dto.applicableLevels,
        jurisdictionTypeRule: dto.jurisdictionTypeRule,
        jurisdictionExpandToChildren: dto.jurisdictionExpandToChildren ?? false,
        capabilities: dto.capabilities ?? [],
        rank: dto.rank ?? 0,
        createdById: actorBearerId,
      },
    });

    await this.auditLog.record({
      actorBearerId,
      action: AuditAction.POST_CHANGED,
      targetType: 'Post',
      targetId: post.id,
      metadata: { change: 'created', name: post.name },
    });

    return post;
  }

  async update(id: string, dto: UpdatePostDto, actorBearerId: string) {
    const existing = await this.prisma.post.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({ error: 'POST_NOT_FOUND', message: 'Post does not exist' });
    }

    const post = await this.prisma.post.update({
      where: { id },
      data: {
        name: dto.name,
        body: dto.body,
        applicableLevels: dto.applicableLevels,
        jurisdictionTypeRule: dto.jurisdictionTypeRule,
        jurisdictionExpandToChildren: dto.jurisdictionExpandToChildren,
        capabilities: dto.capabilities,
        active: dto.active,
        rank: dto.rank,
      },
    });

    await this.auditLog.record({
      actorBearerId,
      action: AuditAction.POST_CHANGED,
      targetType: 'Post',
      targetId: post.id,
      metadata: { change: 'updated', fields: Object.keys(dto) },
    });

    return post;
  }
}
