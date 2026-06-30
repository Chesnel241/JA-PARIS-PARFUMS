-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('PARFUM', 'ACCESSOIRE');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "category" "ProductCategory" NOT NULL DEFAULT 'PARFUM';
