-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('NEW', 'CONTACTED', 'ACCEPTED', 'REJECTED');

-- AlterTable
ALTER TABLE "Ambassador" ADD COLUMN     "role" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "openingHours" SET DATA TYPE TEXT USING ("openingHours" #>> '{}');

-- CreateTable
CREATE TABLE "AmbassadorApplication" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "instagram" TEXT,
    "city" TEXT,
    "message" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AmbassadorApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AmbassadorApplication_status_createdAt_idx" ON "AmbassadorApplication"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Ambassador_isActive_sortOrder_idx" ON "Ambassador"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "Store_isActive_sortOrder_idx" ON "Store"("isActive", "sortOrder");

