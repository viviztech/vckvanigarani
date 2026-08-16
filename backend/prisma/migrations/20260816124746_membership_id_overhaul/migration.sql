-- CreateEnum
CREATE TYPE "PendingRegistrationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'REGISTRATION_APPROVED';
ALTER TYPE "AuditAction" ADD VALUE 'REGISTRATION_REJECTED';

-- AlterTable
ALTER TABLE "Bearer" ADD COLUMN     "homeDistrictId" TEXT;

-- AlterTable
ALTER TABLE "JurisdictionUnit" ADD COLUMN     "code" TEXT;

-- CreateTable
CREATE TABLE "PendingRegistration" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "fatherOrHusbandName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT NOT NULL,
    "habitationOrStreet" TEXT NOT NULL,
    "idProofRef" TEXT NOT NULL,
    "photoUrl" TEXT,
    "homeDistrictId" TEXT NOT NULL,
    "homeAdministrativeUnitId" TEXT,
    "homeElectoralUnitId" TEXT,
    "status" "PendingRegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedByBearerId" TEXT,
    "resultingBearerId" TEXT,
    "rejectionReason" TEXT,

    CONSTRAINT "PendingRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DistrictMembershipCounter" (
    "districtCode" TEXT NOT NULL,
    "nextNumber" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DistrictMembershipCounter_pkey" PRIMARY KEY ("districtCode")
);

-- CreateIndex
CREATE INDEX "PendingRegistration_status_idx" ON "PendingRegistration"("status");

-- CreateIndex
CREATE UNIQUE INDEX "JurisdictionUnit_code_key" ON "JurisdictionUnit"("code");

-- AddForeignKey
ALTER TABLE "Bearer" ADD CONSTRAINT "Bearer_homeDistrictId_fkey" FOREIGN KEY ("homeDistrictId") REFERENCES "JurisdictionUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingRegistration" ADD CONSTRAINT "PendingRegistration_homeDistrictId_fkey" FOREIGN KEY ("homeDistrictId") REFERENCES "JurisdictionUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Data backfill: district codes, used as the district segment of
-- VCK-VGA-<code>-00001 membership IDs. Permanent once IDs referencing them
-- are issued, so pick carefully — this is the one-time source of truth.
UPDATE "JurisdictionUnit" SET "code" = 'ARY' WHERE tree='ADMINISTRATIVE' AND type='DISTRICT' AND name='Ariyalur';
UPDATE "JurisdictionUnit" SET "code" = 'CGL' WHERE tree='ADMINISTRATIVE' AND type='DISTRICT' AND name='Chengalpattu';
UPDATE "JurisdictionUnit" SET "code" = 'CHN' WHERE tree='ADMINISTRATIVE' AND type='DISTRICT' AND name='Chennai';
UPDATE "JurisdictionUnit" SET "code" = 'CBE' WHERE tree='ADMINISTRATIVE' AND type='DISTRICT' AND name='Coimbatore';
UPDATE "JurisdictionUnit" SET "code" = 'CUD' WHERE tree='ADMINISTRATIVE' AND type='DISTRICT' AND name='Cuddalore';
UPDATE "JurisdictionUnit" SET "code" = 'DPI' WHERE tree='ADMINISTRATIVE' AND type='DISTRICT' AND name='Dharmapuri';
UPDATE "JurisdictionUnit" SET "code" = 'DGL' WHERE tree='ADMINISTRATIVE' AND type='DISTRICT' AND name='Dindigul';
UPDATE "JurisdictionUnit" SET "code" = 'ERD' WHERE tree='ADMINISTRATIVE' AND type='DISTRICT' AND name='Erode';
UPDATE "JurisdictionUnit" SET "code" = 'KLK' WHERE tree='ADMINISTRATIVE' AND type='DISTRICT' AND name='Kallakurichi';
UPDATE "JurisdictionUnit" SET "code" = 'KCP' WHERE tree='ADMINISTRATIVE' AND type='DISTRICT' AND name='Kancheepuram';
UPDATE "JurisdictionUnit" SET "code" = 'KNK' WHERE tree='ADMINISTRATIVE' AND type='DISTRICT' AND name='Kanniyakumari';
UPDATE "JurisdictionUnit" SET "code" = 'KRR' WHERE tree='ADMINISTRATIVE' AND type='DISTRICT' AND name='Karur';
UPDATE "JurisdictionUnit" SET "code" = 'KRG' WHERE tree='ADMINISTRATIVE' AND type='DISTRICT' AND name='Krishnagiri';
UPDATE "JurisdictionUnit" SET "code" = 'MDU' WHERE tree='ADMINISTRATIVE' AND type='DISTRICT' AND name='Madurai';
UPDATE "JurisdictionUnit" SET "code" = 'MYL' WHERE tree='ADMINISTRATIVE' AND type='DISTRICT' AND name='Mayiladuthurai';
UPDATE "JurisdictionUnit" SET "code" = 'NGP' WHERE tree='ADMINISTRATIVE' AND type='DISTRICT' AND name='Nagapattinam';
UPDATE "JurisdictionUnit" SET "code" = 'NMK' WHERE tree='ADMINISTRATIVE' AND type='DISTRICT' AND name='Namakkal';
UPDATE "JurisdictionUnit" SET "code" = 'PRM' WHERE tree='ADMINISTRATIVE' AND type='DISTRICT' AND name='Perambalur';
UPDATE "JurisdictionUnit" SET "code" = 'PDK' WHERE tree='ADMINISTRATIVE' AND type='DISTRICT' AND name='Pudukkottai';
UPDATE "JurisdictionUnit" SET "code" = 'RMD' WHERE tree='ADMINISTRATIVE' AND type='DISTRICT' AND name='Ramanathapuram';
UPDATE "JurisdictionUnit" SET "code" = 'RNP' WHERE tree='ADMINISTRATIVE' AND type='DISTRICT' AND name='Ranipet';
UPDATE "JurisdictionUnit" SET "code" = 'SLM' WHERE tree='ADMINISTRATIVE' AND type='DISTRICT' AND name='Salem';
UPDATE "JurisdictionUnit" SET "code" = 'SVG' WHERE tree='ADMINISTRATIVE' AND type='DISTRICT' AND name='Sivagangai';
UPDATE "JurisdictionUnit" SET "code" = 'TNK' WHERE tree='ADMINISTRATIVE' AND type='DISTRICT' AND name='Tenkasi';
UPDATE "JurisdictionUnit" SET "code" = 'TNJ' WHERE tree='ADMINISTRATIVE' AND type='DISTRICT' AND name='Thanjavur';
UPDATE "JurisdictionUnit" SET "code" = 'NLG' WHERE tree='ADMINISTRATIVE' AND type='DISTRICT' AND name='The Nilgiris';
UPDATE "JurisdictionUnit" SET "code" = 'THN' WHERE tree='ADMINISTRATIVE' AND type='DISTRICT' AND name='Theni';
UPDATE "JurisdictionUnit" SET "code" = 'TVL' WHERE tree='ADMINISTRATIVE' AND type='DISTRICT' AND name='Thiruvallur';
UPDATE "JurisdictionUnit" SET "code" = 'TVM' WHERE tree='ADMINISTRATIVE' AND type='DISTRICT' AND name='Thiruvannamalai';
UPDATE "JurisdictionUnit" SET "code" = 'TVR' WHERE tree='ADMINISTRATIVE' AND type='DISTRICT' AND name='Thiruvarur';
UPDATE "JurisdictionUnit" SET "code" = 'TUT' WHERE tree='ADMINISTRATIVE' AND type='DISTRICT' AND name='Thoothukudi';
UPDATE "JurisdictionUnit" SET "code" = 'TRY' WHERE tree='ADMINISTRATIVE' AND type='DISTRICT' AND name='Tiruchirappalli';
UPDATE "JurisdictionUnit" SET "code" = 'TNV' WHERE tree='ADMINISTRATIVE' AND type='DISTRICT' AND name='Tirunelveli';
UPDATE "JurisdictionUnit" SET "code" = 'TPT' WHERE tree='ADMINISTRATIVE' AND type='DISTRICT' AND name='Tirupathur';
UPDATE "JurisdictionUnit" SET "code" = 'TPR' WHERE tree='ADMINISTRATIVE' AND type='DISTRICT' AND name='Tiruppur';
UPDATE "JurisdictionUnit" SET "code" = 'VLR' WHERE tree='ADMINISTRATIVE' AND type='DISTRICT' AND name='Vellore';
UPDATE "JurisdictionUnit" SET "code" = 'VPM' WHERE tree='ADMINISTRATIVE' AND type='DISTRICT' AND name='Villupuram';
UPDATE "JurisdictionUnit" SET "code" = 'VDN' WHERE tree='ADMINISTRATIVE' AND type='DISTRICT' AND name='Virudhunagar';

-- Seed the counter table with every district code just assigned above.
INSERT INTO "DistrictMembershipCounter" ("districtCode", "nextNumber")
SELECT "code", 0 FROM "JurisdictionUnit" WHERE tree='ADMINISTRATIVE' AND type='DISTRICT' AND "code" IS NOT NULL;

-- Superseded by DistrictMembershipCounter (per-district, not global).
DROP SEQUENCE IF EXISTS "bearer_membership_seq";
