/*
  Warnings:

  - You are about to drop the column `claimedAt` on the `AdClaim` table. All the data in the column will be lost.
  - The `date` column on the `AdClaim` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `updatedAt` on the `Payment` table. All the data in the column will be lost.
  - The `status` column on the `Payment` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[token]` on the table `PasswordReset` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'completed', 'failed');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'INFO';
ALTER TYPE "NotificationType" ADD VALUE 'WARNING';
ALTER TYPE "NotificationType" ADD VALUE 'ALERT';
ALTER TYPE "NotificationType" ADD VALUE 'SYSTEM';

-- DropIndex
DROP INDEX "EmailVerification_email_idx";

-- DropIndex
DROP INDEX "PasswordReset_email_idx";

-- DropIndex
DROP INDEX "Payment_email_idx";

-- DropIndex
DROP INDEX "Payment_purpose_status_idx";

-- AlterTable
ALTER TABLE "AdClaim" DROP COLUMN "claimedAt",
ALTER COLUMN "points" SET DEFAULT 0,
DROP COLUMN "date",
ADD COLUMN     "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "EmailVerification" ADD COLUMN     "code" TEXT;

-- AlterTable
ALTER TABLE "PasswordReset" ADD COLUMN     "token" TEXT,
ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "updatedAt",
ADD COLUMN     "provider" TEXT,
ADD COLUMN     "reference" TEXT,
ALTER COLUMN "currency" SET DEFAULT 'USD',
ALTER COLUMN "method" DROP NOT NULL,
ALTER COLUMN "purpose" DROP NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "PaymentStatus" NOT NULL DEFAULT 'pending';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "emailVerifiedAt" DROP NOT NULL,
ALTER COLUMN "firstName" DROP NOT NULL,
ALTER COLUMN "gender" DROP NOT NULL,
ALTER COLUMN "lastName" DROP NOT NULL,
ALTER COLUMN "phone" DROP NOT NULL,
ALTER COLUMN "username" DROP NOT NULL,
ALTER COLUMN "pinHash" DROP NOT NULL,
ALTER COLUMN "pinHash" DROP DEFAULT;

-- CreateTable
CREATE TABLE "Ad" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "rewardPoints" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ad_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdClaim_userId_date_idx" ON "AdClaim"("userId", "date");

-- CreateIndex
CREATE INDEX "AdClaim_adId_date_idx" ON "AdClaim"("adId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "AdClaim_userId_adId_date_key" ON "AdClaim"("userId", "adId", "date");

-- CreateIndex
CREATE INDEX "EmailVerification_email_used_idx" ON "EmailVerification"("email", "used");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordReset_token_key" ON "PasswordReset"("token");

-- CreateIndex
CREATE INDEX "PasswordReset_email_used_idx" ON "PasswordReset"("email", "used");

-- CreateIndex
CREATE INDEX "PasswordReset_userId_idx" ON "PasswordReset"("userId");

-- CreateIndex
CREATE INDEX "Payment_email_status_idx" ON "Payment"("email", "status");

-- AddForeignKey
ALTER TABLE "AdClaim" ADD CONSTRAINT "AdClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdClaim" ADD CONSTRAINT "AdClaim_adId_fkey" FOREIGN KEY ("adId") REFERENCES "Ad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordReset" ADD CONSTRAINT "PasswordReset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
