/**
 * One-off backfill for JurisdictionUnit.districtId on existing Assembly
 * Constituency rows — this field was added by the
 * assembly_constituency_district_crossref migration (schema only, no data),
 * so every AC seeded before this script existed with districtId left null.
 * Both Register.tsx (public site) and BearerForm.tsx (admin-web) filter the
 * AC dropdown by the selected district via this field, so a null districtId
 * makes that dropdown always come back empty.
 *
 * prisma/seed-data/ac-district-mapping.json was built from Wikipedia's
 * "List of constituencies of the Tamil Nadu Legislative Assembly" (raw
 * wikitext, parsed directly) — {acName, pcName, districtName} per AC,
 * disambiguated by (name, parent PC name) since one AC name (Tiruppattur)
 * is genuinely reused across two different districts.
 *
 * Idempotent (setting the same districtId again is harmless) -- safe to
 * re-run. Run: npx ts-node prisma/backfill-ac-district.ts
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaService } from '../src/prisma/prisma.service';
import { JurisdictionTree, JurisdictionType } from '../generated/prisma/enums';

interface MappingEntry {
  acName: string;
  pcName: string;
  districtName: string;
}

async function main() {
  const mapping: MappingEntry[] = JSON.parse(
    readFileSync(join(__dirname, 'seed-data', 'ac-district-mapping.json'), 'utf-8'),
  );

  const prisma = new PrismaService();
  await prisma.onModuleInit();

  try {
    const districts = await prisma.jurisdictionUnit.findMany({
      where: { tree: JurisdictionTree.ADMINISTRATIVE, type: JurisdictionType.DISTRICT },
    });
    const districtIdByName = new Map(districts.map((d) => [d.name, d.id]));

    const pcs = await prisma.jurisdictionUnit.findMany({
      where: { tree: JurisdictionTree.ELECTORAL, type: JurisdictionType.PARLIAMENT_CONSTITUENCY },
    });
    const pcIdByName = new Map(pcs.map((p) => [p.name, p.id]));

    let updated = 0;
    let skipped = 0;
    for (const entry of mapping) {
      const districtId = districtIdByName.get(entry.districtName);
      const pcId = pcIdByName.get(entry.pcName);
      if (!districtId || !pcId) {
        console.log(`skip (no match) ${entry.acName} — district="${entry.districtName}" pc="${entry.pcName}"`);
        skipped++;
        continue;
      }

      const result = await prisma.jurisdictionUnit.updateMany({
        where: {
          tree: JurisdictionTree.ELECTORAL,
          type: JurisdictionType.ASSEMBLY_CONSTITUENCY,
          name: entry.acName,
          parentId: pcId,
        },
        data: { districtId },
      });

      if (result.count === 0) {
        console.log(`skip (no matching AC row) ${entry.acName} under PC "${entry.pcName}"`);
        skipped++;
      } else {
        console.log(`updated         ${entry.acName} -> district ${entry.districtName}`);
        updated += result.count;
      }
    }

    console.log(`\nDone. Updated: ${updated}, skipped: ${skipped}, total mapping rows: ${mapping.length}`);
  } finally {
    await prisma.onModuleDestroy();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
