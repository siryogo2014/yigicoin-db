-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastTotemUsedAt" TIMESTAMP(3),
ADD COLUMN     "pinHash" TEXT NOT NULL DEFAULT '';
