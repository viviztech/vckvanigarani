-- CreateEnum
CREATE TYPE "NewsPostStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'UNPUBLISHED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'NEWS_POST_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'NEWS_POST_EDITED';
ALTER TYPE "AuditAction" ADD VALUE 'NEWS_POST_PUBLISHED';
ALTER TYPE "AuditAction" ADD VALUE 'NEWS_POST_UNPUBLISHED';

-- DropIndex
DROP INDEX "Bearer_fullName_trgm_idx";

-- CreateTable
CREATE TABLE "NewsPost" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "targetEveryone" BOOLEAN NOT NULL DEFAULT false,
    "status" "NewsPostStatus" NOT NULL DEFAULT 'DRAFT',
    "authorId" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deepLinkSlug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsPostJurisdiction" (
    "newsPostId" TEXT NOT NULL,
    "jurisdictionUnitId" TEXT NOT NULL,

    CONSTRAINT "NewsPostJurisdiction_pkey" PRIMARY KEY ("newsPostId","jurisdictionUnitId")
);

-- CreateIndex
CREATE UNIQUE INDEX "NewsPost_deepLinkSlug_key" ON "NewsPost"("deepLinkSlug");

-- CreateIndex
CREATE INDEX "NewsPost_status_idx" ON "NewsPost"("status");

-- CreateIndex
CREATE INDEX "NewsPostJurisdiction_jurisdictionUnitId_idx" ON "NewsPostJurisdiction"("jurisdictionUnitId");

-- AddForeignKey
ALTER TABLE "NewsPost" ADD CONSTRAINT "NewsPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Bearer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsPostJurisdiction" ADD CONSTRAINT "NewsPostJurisdiction_newsPostId_fkey" FOREIGN KEY ("newsPostId") REFERENCES "NewsPost"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsPostJurisdiction" ADD CONSTRAINT "NewsPostJurisdiction_jurisdictionUnitId_fkey" FOREIGN KEY ("jurisdictionUnitId") REFERENCES "JurisdictionUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
