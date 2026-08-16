import { randomUUID } from 'node:crypto';
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JurisdictionTree, JurisdictionType } from '../../../generated/prisma/enums';
import type { JurisdictionUnit } from '../../../generated/prisma/client';

/**
 * Immediate allowed parent type per tree (data-model.md's JurisdictionUnit
 * validation). STATE has no parent — it's the root of each tree.
 */
const REQUIRED_PARENT_TYPE: Record<JurisdictionTree, Partial<Record<JurisdictionType, JurisdictionType>>> = {
  ADMINISTRATIVE: {
    DISTRICT: JurisdictionType.STATE,
    BLOCK: JurisdictionType.DISTRICT,
    MUNICIPALITY: JurisdictionType.DISTRICT,
    TOWN_PANCHAYAT: JurisdictionType.DISTRICT,
    VILLAGE: JurisdictionType.BLOCK,
  },
  ELECTORAL: {
    PARLIAMENT_CONSTITUENCY: JurisdictionType.STATE,
    ASSEMBLY_CONSTITUENCY: JurisdictionType.PARLIAMENT_CONSTITUENCY,
  },
};

/**
 * Maintains the materialized `path`/`depth` on JurisdictionUnit — this is
 * what turns "is X inside my subtree" into an indexed prefix check instead
 * of a recursive query, everywhere else in the app (the access guard,
 * feed/report queries). See specs/001-bearer-hierarchy-register/research.md §2.
 */
@Injectable()
export class JurisdictionPathService {
  constructor(private readonly prisma: PrismaService) {}

  /** A is an ancestor of (or the same unit as) B iff A's path is a prefix of B's path. */
  static isAncestorOrSelf(ancestorPath: string[], candidatePath: string[]): boolean {
    if (ancestorPath.length > candidatePath.length) return false;
    return ancestorPath.every((id, i) => candidatePath[i] === id);
  }

  async createUnit(input: {
    tree: JurisdictionTree;
    type: JurisdictionType;
    name: string;
    parentId?: string | null;
  }): Promise<JurisdictionUnit> {
    const parent = input.parentId
      ? await this.prisma.jurisdictionUnit.findUnique({ where: { id: input.parentId } })
      : null;
    if (input.parentId && !parent) {
      throw new NotFoundException({ error: 'PARENT_NOT_FOUND', message: 'Parent jurisdiction unit does not exist' });
    }

    this.assertValidParent(input.tree, input.type, parent);

    const id = randomUUID();
    const path = parent ? [...parent.path, id] : [id];
    const depth = parent ? parent.depth + 1 : 0;

    return this.prisma.jurisdictionUnit.create({
      data: {
        id,
        tree: input.tree,
        type: input.type,
        name: input.name,
        parentId: parent?.id ?? null,
        path,
        depth,
      },
    });
  }

  /**
   * Re-points a unit (and cascades to every descendant's `path`/`depth`) to a
   * new parent — the merge/reorganize case from spec.md's edge cases.
   * AssignmentJurisdiction rows reference units by id, so they stay valid
   * automatically; only the materialized path needs recomputation here.
   */
  async reparent(unitId: string, newParentId: string | null): Promise<JurisdictionUnit> {
    return this.prisma.$transaction(async (tx) => {
      const unit = await tx.jurisdictionUnit.findUnique({ where: { id: unitId } });
      if (!unit) {
        throw new NotFoundException({ error: 'JURISDICTION_NOT_FOUND', message: 'Jurisdiction unit does not exist' });
      }
      const newParent = newParentId ? await tx.jurisdictionUnit.findUnique({ where: { id: newParentId } }) : null;
      if (newParentId && !newParent) {
        throw new NotFoundException({ error: 'PARENT_NOT_FOUND', message: 'Parent jurisdiction unit does not exist' });
      }

      this.assertValidParent(unit.tree, unit.type, newParent);

      const newPrefix = newParent ? [...newParent.path, unit.id] : [unit.id];
      const newDepth = newParent ? newParent.depth + 1 : 0;
      const depthDelta = newDepth - unit.depth;

      // Every row whose path contains unit.id is either the unit itself or a
      // descendant — both need their path rewritten under the new prefix.
      const affected = await tx.jurisdictionUnit.findMany({ where: { path: { has: unit.id } } });

      for (const row of affected) {
        const cutIndex = row.path.indexOf(unit.id);
        const updatedPath = [...newPrefix, ...row.path.slice(cutIndex + 1)];
        await tx.jurisdictionUnit.update({
          where: { id: row.id },
          data: {
            path: updatedPath,
            depth: row.depth + depthDelta,
            ...(row.id === unit.id ? { parentId: newParent?.id ?? null } : {}),
          },
        });
      }

      return tx.jurisdictionUnit.findUniqueOrThrow({ where: { id: unit.id } });
    });
  }

  private assertValidParent(
    tree: JurisdictionTree,
    type: JurisdictionType,
    parent: JurisdictionUnit | null,
  ): void {
    if (type === JurisdictionType.STATE) {
      if (parent) {
        throw new BadRequestException({
          error: 'INVALID_PARENT',
          message: 'STATE is the root of its tree and cannot have a parent',
        });
      }
      return;
    }

    const requiredParentType = REQUIRED_PARENT_TYPE[tree][type];
    if (!requiredParentType) {
      throw new BadRequestException({ error: 'INVALID_TYPE', message: `${type} is not valid in the ${tree} tree` });
    }
    if (!parent || parent.tree !== tree || parent.type !== requiredParentType) {
      throw new BadRequestException({
        error: 'INVALID_PARENT',
        message: `${type} in the ${tree} tree must have a ${requiredParentType} parent`,
      });
    }
  }
}
