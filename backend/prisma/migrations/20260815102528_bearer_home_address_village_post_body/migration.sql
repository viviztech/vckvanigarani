/*
  Warnings:

  - Added the required column `fatherOrHusbandName` to the `Bearer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `habitationOrStreet` to the `Bearer` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PostBody" AS ENUM ('MAIN', 'SUB');

-- AlterEnum
ALTER TYPE "JurisdictionType" ADD VALUE 'VILLAGE';

-- AlterEnum
ALTER TYPE "OrgLevel" ADD VALUE 'VILLAGE';

-- AlterTable
-- "Not set" backfills pre-existing rows (matches bootstrap-super-admin.ts's
-- own placeholder convention for address/idProofRef) — the DTO requires a
-- real value on every write going forward, this default only covers rows
-- that predate this migration.
ALTER TABLE "Bearer" ADD COLUMN     "email" TEXT,
ADD COLUMN     "fatherOrHusbandName" TEXT NOT NULL DEFAULT 'Not set',
ADD COLUMN     "habitationOrStreet" TEXT NOT NULL DEFAULT 'Not set',
ADD COLUMN     "homeAdministrativeUnitId" TEXT,
ADD COLUMN     "homeElectoralUnitId" TEXT;
ALTER TABLE "Bearer" ALTER COLUMN "fatherOrHusbandName" DROP DEFAULT;
ALTER TABLE "Bearer" ALTER COLUMN "habitationOrStreet" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "body" "PostBody" NOT NULL DEFAULT 'MAIN';

-- AddForeignKey
ALTER TABLE "Bearer" ADD CONSTRAINT "Bearer_homeAdministrativeUnitId_fkey" FOREIGN KEY ("homeAdministrativeUnitId") REFERENCES "JurisdictionUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bearer" ADD CONSTRAINT "Bearer_homeElectoralUnitId_fkey" FOREIGN KEY ("homeElectoralUnitId") REFERENCES "JurisdictionUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
