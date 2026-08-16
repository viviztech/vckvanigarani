/**
 * Feature 001 T026 — jurisdiction master-data seed.
 *
 * Imports prisma/seed-data/*.json through JurisdictionPathService so every
 * unit gets correct path/depth (research.md §2), idempotently (safe to
 * re-run — an existing unit with the same tree/type/name/parent is skipped,
 * not duplicated).
 *
 * The bundled tamil-nadu.json is a SAMPLE, not the authoritative ECI/TN
 * dataset — see its _readme field and spec.md's Assumptions. Point this
 * script at a real bulk-sourced file (same shape) to seed production data.
 *
 * Run: npm run prisma:seed  (or `prisma db seed`)
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaService } from '../src/prisma/prisma.service';
import { JurisdictionPathService } from '../src/modules/jurisdictions/jurisdiction-path.util';
import { JurisdictionTree, JurisdictionType } from '../generated/prisma/enums';

interface SeedEntry {
  key: string;
  type: JurisdictionType;
  name: string;
  parentKey: string | null;
}

interface SeedFile {
  administrative: SeedEntry[];
  electoral: SeedEntry[];
}

async function importTree(
  entries: SeedEntry[],
  tree: JurisdictionTree,
  prisma: PrismaService,
  paths: JurisdictionPathService,
): Promise<void> {
  const createdIdByKey = new Map<string, string>();

  for (const entry of entries) {
    const parentId = entry.parentKey ? createdIdByKey.get(entry.parentKey) : null;
    if (entry.parentKey && !parentId) {
      throw new Error(`Seed data lists "${entry.key}" before its parent "${entry.parentKey}" — fix the file order`);
    }

    const existing = await prisma.jurisdictionUnit.findFirst({
      where: { tree, type: entry.type, name: entry.name, parentId: parentId ?? null },
    });
    if (existing) {
      createdIdByKey.set(entry.key, existing.id);
      console.log(`skip  (exists) ${tree} ${entry.type} "${entry.name}"`);
      continue;
    }

    const unit = await paths.createUnit({ tree, type: entry.type, name: entry.name, parentId: parentId ?? undefined });
    createdIdByKey.set(entry.key, unit.id);
    console.log(`create          ${tree} ${entry.type} "${entry.name}"`);
  }
}

async function main() {
  const dataPath = process.argv[2] ?? join(__dirname, 'seed-data', 'tamil-nadu.json');
  const seed: SeedFile = JSON.parse(readFileSync(dataPath, 'utf-8'));

  const prisma = new PrismaService();
  await prisma.onModuleInit();
  const paths = new JurisdictionPathService(prisma);

  try {
    await importTree(seed.administrative, JurisdictionTree.ADMINISTRATIVE, prisma, paths);
    await importTree(seed.electoral, JurisdictionTree.ELECTORAL, prisma, paths);
  } finally {
    await prisma.onModuleDestroy();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
