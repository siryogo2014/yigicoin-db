/*
  Warnings:

  - A unique constraint covering the columns `[reference]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "userId" TEXT;

-- CreateTable
CREATE TABLE "RankUpgradeLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fromRank" "UserRank" NOT NULL,
    "toRank" "UserRank" NOT NULL,
    "provider" TEXT NOT NULL,
    "paymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RankUpgradeLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RankUpgradeLog_userId_createdAt_idx" ON "RankUpgradeLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "RankUpgradeLog_paymentId_idx" ON "RankUpgradeLog"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_reference_key" ON "Payment"("reference");

-- CreateIndex
CREATE INDEX "Payment_userId_status_idx" ON "Payment"("userId", "status");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankUpgradeLog" ADD CONSTRAINT "RankUpgradeLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankUpgradeLog" ADD CONSTRAINT "RankUpgradeLog_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
