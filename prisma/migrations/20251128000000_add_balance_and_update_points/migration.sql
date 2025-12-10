-- AlterTable: Add balance field and update points default
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "balance" INTEGER NOT NULL DEFAULT 10000;
ALTER TABLE "User" ALTER COLUMN "points" SET DEFAULT 1000;
