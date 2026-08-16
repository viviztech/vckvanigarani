-- CreateEnum
CREATE TYPE "OrgLevel" AS ENUM ('STATE', 'DISTRICT', 'BLOCK', 'MUNICIPALITY', 'TOWN_PANCHAYAT');

-- CreateEnum
CREATE TYPE "JurisdictionType" AS ENUM ('STATE', 'DISTRICT', 'BLOCK', 'MUNICIPALITY', 'TOWN_PANCHAYAT', 'PARLIAMENT_CONSTITUENCY', 'ASSEMBLY_CONSTITUENCY');

-- CreateEnum
CREATE TYPE "PostCapability" AS ENUM ('FINANCE_VIEW');

-- CreateEnum
CREATE TYPE "JurisdictionTree" AS ENUM ('ADMINISTRATIVE', 'ELECTORAL');

-- CreateEnum
CREATE TYPE "JurisdictionStatus" AS ENUM ('ACTIVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "BearerStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'STATE_ADMIN', 'DISTRICT_ADMIN', 'LOCAL_ADMIN');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('ASSIGNMENT_CREATED', 'ASSIGNMENT_CLOSED', 'POST_CHANGED', 'JURISDICTION_CHANGED', 'BEARER_STATUS_CHANGED');

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "applicableLevels" "OrgLevel"[],
    "jurisdictionTypeRule" "JurisdictionType",
    "capabilities" "PostCapability"[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JurisdictionUnit" (
    "id" TEXT NOT NULL,
    "tree" "JurisdictionTree" NOT NULL,
    "type" "JurisdictionType" NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "path" TEXT[],
    "depth" INTEGER NOT NULL,
    "status" "JurisdictionStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "JurisdictionUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bearer" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "photoUrl" TEXT,
    "address" TEXT NOT NULL,
    "membershipNo" TEXT NOT NULL,
    "idProofRef" TEXT NOT NULL,
    "status" "BearerStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bearer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "bearerId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "createdById" TEXT,
    "closedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentJurisdiction" (
    "assignmentId" TEXT NOT NULL,
    "jurisdictionUnitId" TEXT NOT NULL,

    CONSTRAINT "AssignmentJurisdiction_pkey" PRIMARY KEY ("assignmentId","jurisdictionUnitId")
);

-- CreateTable
CREATE TABLE "AdminScope" (
    "adminBearerId" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL,
    "scopeJurisdictionUnitId" TEXT,

    CONSTRAINT "AdminScope_pkey" PRIMARY KEY ("adminBearerId")
);

-- CreateTable
CREATE TABLE "AuditLogEntry" (
    "id" TEXT NOT NULL,
    "actorBearerId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Post_active_idx" ON "Post"("active");

-- CreateIndex
CREATE INDEX "JurisdictionUnit_tree_type_idx" ON "JurisdictionUnit"("tree", "type");

-- CreateIndex
CREATE INDEX "JurisdictionUnit_parentId_idx" ON "JurisdictionUnit"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "Bearer_phone_key" ON "Bearer"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Bearer_membershipNo_key" ON "Bearer"("membershipNo");

-- CreateIndex
CREATE INDEX "Bearer_status_idx" ON "Bearer"("status");

-- CreateIndex
CREATE INDEX "Assignment_bearerId_status_idx" ON "Assignment"("bearerId", "status");

-- CreateIndex
CREATE INDEX "Assignment_postId_status_idx" ON "Assignment"("postId", "status");

-- CreateIndex
CREATE INDEX "AssignmentJurisdiction_jurisdictionUnitId_idx" ON "AssignmentJurisdiction"("jurisdictionUnitId");

-- CreateIndex
CREATE INDEX "AuditLogEntry_targetType_targetId_idx" ON "AuditLogEntry"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "AuditLogEntry_actorBearerId_idx" ON "AuditLogEntry"("actorBearerId");

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Bearer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JurisdictionUnit" ADD CONSTRAINT "JurisdictionUnit_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "JurisdictionUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_bearerId_fkey" FOREIGN KEY ("bearerId") REFERENCES "Bearer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Bearer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "Bearer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentJurisdiction" ADD CONSTRAINT "AssignmentJurisdiction_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentJurisdiction" ADD CONSTRAINT "AssignmentJurisdiction_jurisdictionUnitId_fkey" FOREIGN KEY ("jurisdictionUnitId") REFERENCES "JurisdictionUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminScope" ADD CONSTRAINT "AdminScope_adminBearerId_fkey" FOREIGN KEY ("adminBearerId") REFERENCES "Bearer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminScope" ADD CONSTRAINT "AdminScope_scopeJurisdictionUnitId_fkey" FOREIGN KEY ("scopeJurisdictionUnitId") REFERENCES "JurisdictionUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLogEntry" ADD CONSTRAINT "AuditLogEntry_actorBearerId_fkey" FOREIGN KEY ("actorBearerId") REFERENCES "Bearer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
