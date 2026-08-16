-- AlterTable
ALTER TABLE "JurisdictionUnit" ADD COLUMN     "districtId" TEXT;

-- AddForeignKey
ALTER TABLE "JurisdictionUnit" ADD CONSTRAINT "JurisdictionUnit_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "JurisdictionUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
